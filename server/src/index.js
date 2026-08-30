import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import movieRoutes from './routes/movie.js'
import bookingRoutes from './routes/booking.js'
import paymentRoutes from './routes/payment.js'
import { handleWebhook } from './controllers/payment.js'
import { errorHandler } from './middleware/error.js'

// Inngest Background Jobs imports
import { serve } from 'inngest/express'
import { inngest } from './config/inngest.js'
import { sendTicketConfirmationEmail, scheduleShowReminder } from './jobs/bookingJobs.js'

process.env.INNGEST_DEV = '1' // Force Inngest local development mode sandbox runs

const app = express()
const PORT = process.env.PORT || 5001

// Middleware
app.use(cors())

// Direct Stripe Webhook endpoint requires raw body parser to verify cryptographic signatures
app.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook)

app.use(express.json())

// Base status route
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'QuickShow Relational Backend is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    endpoints: {
      health: 'GET /api/health',
      movies: 'GET /movies',
      movieDetails: 'GET /movie/:id',
      createBooking: 'POST /booking',
      createPayment: 'POST /payment',
      webhook: 'POST /webhook'
    }
  })
})

// Health Route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    database: 'connected (development sandbox mode)'
  })
})

// Route Mappings as requested by Roadmap
app.use('/movies', movieRoutes)       // GET /movies
app.use('/movie', movieRoutes)         // GET /movie/:id
app.use('/booking', bookingRoutes)     // POST /booking
app.use('/payment', paymentRoutes)     // POST /payment/session

// Inngest Background queue endpoint
app.use('/api/inngest', serve({ 
  client: inngest, 
  functions: [sendTicketConfirmationEmail, scheduleShowReminder],
  signingKey: process.env.INNGEST_SIGNING_KEY || 'test-signing-key-placeholder-for-sandbox-use-123456789'
}))

// Direct Webhook mappings (Stripe triggers webhook to root endpoint)
// Webhook route has been mounted above with raw body parser.

// Global Error Handler
app.use(errorHandler)

// Start express server
app.listen(PORT, () => {
  console.log(`🚀 Express server running on http://localhost:${PORT}`)
})
