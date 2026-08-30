import redis from '../config/redis.js'

/**
 * Wraps a database query with cache stampede (thundering herd) protection.
 * Uses a Redis distributed lock (SET NX PX) for cache-aside single flight queries.
 * 
 * @param {string} cacheKey The cache key to query
 * @param {function} fetchFn Async function to query the database on cache miss
 * @param {number} ttlSeconds Expiry time for the cache key in seconds (default: 300)
 * @returns {Promise<any>} The parsed query results
 */
export const getCachedOrFetch = async (cacheKey, fetchFn, ttlSeconds = 300) => {
  if (!redis) {
    // Fallback directly to database query if Redis is offline/unavailable
    return await fetchFn()
  }

  const lockKey = `lock:${cacheKey}`
  const maxRetries = 50
  const retryIntervalMs = 100

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // 1. Try to read from cache
    const cachedData = await redis.get(cacheKey)
    if (cachedData) {
      return JSON.parse(cachedData)
    }

    // 2. Cache Miss: Try to acquire distributed mutex lock
    // NX = Only set if not exists, PX = Expire in milliseconds (5000ms limit to prevent deadlock)
    const acquiredLock = await redis.set(lockKey, '1', 'NX', 'PX', 5000)

    if (acquiredLock === 'OK') {
      try {
        console.log(`🎯 Cache Stampede Shield: [${cacheKey}] Locked by thread. Fetching database source...`)
        const freshData = await fetchFn()
        
        // Populate cache in Redis
        await redis.set(cacheKey, JSON.stringify(freshData), 'EX', ttlSeconds)
        return freshData
      } finally {
        // Release distributed lock
        await redis.del(lockKey)
      }
    }

    // 3. Lock not acquired (Another request is already querying database). Wait and retry.
    await new Promise(resolve => setTimeout(resolve, retryIntervalMs))
  }

  // Fallback if retries expire without cache loading (graceful degradation)
  console.warn(`⚠️ Cache Stampede Shield: Retries exhausted for [${cacheKey}]. Falling back to direct database query.`)
  return await fetchFn()
}
