import { createClerkClient } from '@clerk/backend'

const clerkSecretKey = process.env.CLERK_SECRET_KEY
const clerk = clerkSecretKey ? createClerkClient({ secretKey: clerkSecretKey }) : null

export const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization
  const demoUserHeader = req.headers['x-demo-user']

  // 1. Check for dedicated Demo/Interview Concurrency mode
  if (demoUserHeader) {
    const cleanDemo = String(demoUserHeader).toLowerCase().replace(/[^a-z0-9_]/g, '')
    req.auth = {
      userId: `demo_usr_${cleanDemo}`,
      claims: {
        email: `${cleanDemo}@demo-showcity.com`,
        name: cleanDemo.charAt(0).toUpperCase() + cleanDemo.slice(1)
      }
    }
    return next()
  }

  // 2. Check if token is present
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized: Authorization header containing Bearer token is missing. Please sign in.'
    })
  }

  const token = authHeader.split(' ')[1]

  // 3. Fallback demo tokens for side-by-side tab concurrency testing
  if (
    token.startsWith('demo_') ||
    token.startsWith('mock_') ||
    token.startsWith('usr_clerk_mock_')
  ) {
    const userId = token
    const namePart = token.replace(/^(demo_|mock_|usr_clerk_mock_)/, '')
    const displayName = namePart ? (namePart.charAt(0).toUpperCase() + namePart.slice(1)) : 'Demo User'

    req.auth = {
      userId,
      claims: {
        email: `${namePart || 'user'}@demo-showcity.com`,
        name: displayName
      }
    }
    return next()
  }

  // 4. Perform real cryptographic signature verification via Clerk SDK
  if (clerk) {
    try {
      const protocol = req.protocol || 'http'
      const host = req.headers.host || 'localhost:5001'
      const fullUrl = `${protocol}://${host}${req.originalUrl || req.url}`

      const fetchReq = new Request(fullUrl, {
        method: req.method,
        headers: new Headers(req.headers)
      })

      const requestState = await clerk.authenticateRequest(fetchReq, {
        secretKey: clerkSecretKey,
        publishableKey: process.env.CLERK_PUBLISHABLE_KEY
      })

      if (!requestState.isSignedIn) {
        return res.status(401).json({
          error: 'Unauthorized: Invalid or expired Clerk session token'
        })
      }

      req.auth = {
        userId: requestState.toAuth().userId,
        claims: requestState.toAuth().claims
      }

      return next()
    } catch (error) {
      console.error('❌ Clerk authentication signature check failed:', error)
      return res.status(401).json({
        error: 'Unauthorized: Token signature verification failed'
      })
    }
  }

  // 5. Default fallback if Clerk is not configured on server
  req.auth = {
    userId: token,
    claims: {
      email: `${token}@demo-showcity.com`,
      name: 'ShowCity Guest'
    }
  }
  return next()
}
