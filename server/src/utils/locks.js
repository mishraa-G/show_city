import redis from '../config/redis.js'

// In-Memory atomic mutex fallback: key -> { userId, expiresAt }
const inMemoryLocks = new Map()

// Helper to clean up expired in-memory locks periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, lock] of inMemoryLocks.entries()) {
    if (now > lock.expiresAt) {
      inMemoryLocks.delete(key)
    }
  }
}, 3000)

export const normalizeSeatId = (rawSeatId) => {
  if (!rawSeatId) return ''
  // If seatId is "screen-uuid-A-1" or "theatre-screen-A-1", extract the standard "Row-Number" (e.g. "A-1")
  const parts = String(rawSeatId).split('-')
  if (parts.length >= 2) {
    const row = parts[parts.length - 2]
    const num = parts[parts.length - 1]
    if (/^[A-Za-z]$/.test(row) && /^\d+$/.test(num)) {
      return `${row.toUpperCase()}-${num}`
    }
  }
  return String(rawSeatId).trim()
}

export const makeLockKey = (showId, seatId) => {
  const cleanSeat = normalizeSeatId(seatId)
  return `lock:show:${showId}:seat:${cleanSeat}`
}

/**
 * Redis Lua script for 100% Atomic Multi-Seat Lock Acquisition
 * Returns {1, "OK"} on success, or {0, conflictingKey, currentHolder} on failure.
 */
const ACQUIRE_LOCKS_LUA = `
local userId = ARGV[1]
local ttl = tonumber(ARGV[2])

-- 1. Pre-check: Verify every key is either free or already held by the same user
for i, key in ipairs(KEYS) do
  local currentHolder = redis.call('get', key)
  if currentHolder and currentHolder ~= userId then
    return {0, key, currentHolder}
  end
end

-- 2. Atomic Acquisition: Set all keys with TTL
for i, key in ipairs(KEYS) do
  redis.call('set', key, userId, 'EX', ttl)
end

return {1, 'OK'}
`

/**
 * Atomically acquires locks for multiple seats with a specified TTL.
 * @param {string} showId
 * @param {string[]} seatIds
 * @param {string} userId
 * @param {number} ttlSeconds Default: 600s (10 minutes)
 * @returns {Promise<{ success: boolean, conflictingSeats?: string[], ttl: number }>}
 */
export const acquireSeatsLock = async (showId, seatIds, userId, ttlSeconds = 600) => {
  if (!seatIds || seatIds.length === 0) {
    return { success: true, ttl: ttlSeconds }
  }

  const cleanSeats = seatIds.map(normalizeSeatId)
  const keys = cleanSeats.map(s => makeLockKey(showId, s))

  // 1. Try Redis Atomic Lua Script Execution
  if (redis && redis.status === 'ready') {
    try {
      const result = await redis.eval(
        ACQUIRE_LOCKS_LUA,
        keys.length,
        ...keys,
        userId,
        ttlSeconds
      )

      if (result && result[0] === 1) {
        console.log(`🔒 [Redis Lock] Successfully locked seats [${cleanSeats.join(', ')}] for user ${userId} (${ttlSeconds}s TTL)`)
        return { success: true, ttl: ttlSeconds }
      }

      // Conflict occurred
      const conflictKey = result ? result[1] : 'unknown'
      const conflictSeat = conflictKey.split(':').pop()
      console.warn(`⚠️ [Redis Lock Conflict] Seat ${conflictSeat} is already held by another session`)
      return {
        success: false,
        conflictingSeats: [conflictSeat],
        ttl: 0
      }
    } catch (err) {
      console.warn('⚠️ Redis eval failed or timed out. Falling back to Atomic In-Memory engine:', err.message)
    }
  }

  // 2. In-Memory Atomic Lock Engine Fallback (Thread-Safe within Node.js Event Loop)
  const now = Date.now()
  const conflicting = []

  // Check all requested seats first
  for (const seat of cleanSeats) {
    const key = makeLockKey(showId, seat)
    const existing = inMemoryLocks.get(key)
    if (existing && now < existing.expiresAt && existing.userId !== userId) {
      conflicting.push(seat)
    }
  }

  if (conflicting.length > 0) {
    console.warn(`⚠️ [In-Memory Conflict] Seats [${conflicting.join(', ')}] are already locked by another user`)
    return { success: false, conflictingSeats: conflicting, ttl: 0 }
  }

  // Atomically set all locks
  const expiresAt = now + (ttlSeconds * 1000)
  cleanSeats.forEach(seat => {
    const key = makeLockKey(showId, seat)
    inMemoryLocks.set(key, { userId, expiresAt })
  })

  console.log(`🔒 [In-Memory Lock] Acquired locks for [${cleanSeats.join(', ')}] for user ${userId} (${ttlSeconds}s TTL)`)
  return { success: true, ttl: ttlSeconds }
}

/**
 * Releases seat locks. If userId is passed, only releases seats owned by that user.
 */
export const releaseSeats = async (showId, seatIds, userId = null) => {
  if (!seatIds || seatIds.length === 0) return

  const cleanSeats = seatIds.map(normalizeSeatId)
  const keys = cleanSeats.map(s => makeLockKey(showId, s))

  // 1. Release in Redis
  if (redis && redis.status === 'ready') {
    try {
      if (userId) {
        // Safe check-and-del: only delete if current value matches userId
        const RELEASE_LUA = `
        for i, key in ipairs(KEYS) do
          local val = redis.call('get', key)
          if val == ARGV[1] then
            redis.call('del', key)
          end
        end
        return 1
        `
        await redis.eval(RELEASE_LUA, keys.length, ...keys, userId)
      } else {
        await redis.del(keys)
      }
      console.log(`🔓 [Redis Lock Released] Seats [${cleanSeats.join(', ')}] for show ${showId}`)
    } catch (err) {
      console.warn('⚠️ Failed to release Redis lock:', err.message)
    }
  }

  // 2. Always release in in-memory fallback
  cleanSeats.forEach(seat => {
    const key = makeLockKey(showId, seat)
    const lock = inMemoryLocks.get(key)
    if (!userId || (lock && lock.userId === userId)) {
      inMemoryLocks.delete(key)
    }
  })

  console.log(`🔓 [In-Memory Lock Released] Seats [${cleanSeats.join(', ')}] for show ${showId}`)
}

/**
 * Retrieves all currently active locked seats for a show with remaining TTL.
 */
export const getActiveLocks = async (showId) => {
  const locksMap = {} // seatId -> { userId, ttl }
  const now = Date.now()

  // 1. In-Memory active locks
  const prefix = `lock:show:${showId}:seat:`
  for (const [key, lock] of inMemoryLocks.entries()) {
    if (key.startsWith(prefix) && now < lock.expiresAt) {
      const seatId = key.substring(prefix.length)
      const remainingSec = Math.max(1, Math.ceil((lock.expiresAt - now) / 1000))
      locksMap[seatId] = {
        seatId,
        userId: lock.userId,
        ttl: remainingSec
      }
    }
  }

  // 2. Redis active locks
  if (redis && redis.status === 'ready') {
    try {
      const pattern = `lock:show:${showId}:seat:*`
      const keys = await redis.keys(pattern)
      if (keys.length > 0) {
        const pipeline = redis.pipeline()
        keys.forEach(k => {
          pipeline.get(k)
          pipeline.ttl(k)
        })
        const results = await pipeline.exec()

        keys.forEach((key, index) => {
          const userVal = results[index * 2]?.[1]
          const ttlVal = results[index * 2 + 1]?.[1] || 0
          if (userVal && ttlVal > 0) {
            const seatId = key.split(':').pop()
            locksMap[seatId] = {
              seatId,
              userId: userVal,
              ttl: ttlVal
            }
          }
        })
      }
    } catch (err) {
      console.warn('⚠️ Redis getActiveLocks query issue, using in-memory view:', err.message)
    }
  }

  return Object.values(locksMap)
}

// Backward compatibility alias for legacy call sites
export const checkSeatsLocked = async (showId, seatIds, requestingUserId) => {
  const active = await getActiveLocks(showId)
  const lockedIds = []
  const cleanSeats = seatIds.map(normalizeSeatId)

  active.forEach(item => {
    if (cleanSeats.includes(item.seatId) && item.userId !== requestingUserId) {
      lockedIds.push(item.seatId)
    }
  })

  return lockedIds
}

export const lockSeats = async (showId, seatIds, userId, ttl = 600) => {
  return acquireSeatsLock(showId, seatIds, userId, ttl)
}
