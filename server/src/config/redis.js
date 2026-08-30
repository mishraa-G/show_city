import Redis from 'ioredis'

const redisUrl = process.env.REDIS_URL
let redis = null

if (redisUrl) {
  try {
    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      connectTimeout: 4000,
      commandTimeout: 3000,
      enableOfflineQueue: false,
      retryStrategy(times) {
        if (times > 3) return null // Stop retrying and fallback
        return Math.min(times * 500, 2000)
      }
    })
    redis.on('connect', () => {
      console.log('🚀 Redis (Upstash) connected successfully')
    })
    redis.on('error', (err) => {
      console.warn('⚠️ Redis connection issue. Locks will safely use in-memory Atomic Mutex engine fallback.')
    })
  } catch (error) {
    console.error('❌ Failed to initialize Redis client:', error)
    redis = null
  }
} else {
  console.warn('⚠️ Warning: REDIS_URL environment variable is missing. Express server will run in Sandbox Redis Mode using a local in-memory JavaScript cache.')
}

export default redis
