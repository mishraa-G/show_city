import express from 'express'
import { createBooking, getLockedSeats, getUserBookings, releaseBookingSeats } from '../controllers/booking.js'
import { requireAuth } from '../middleware/auth.js'

const router = express.Router()

router.post('/', requireAuth, createBooking)
router.post('/release', requireAuth, releaseBookingSeats)
router.get('/user', requireAuth, getUserBookings)
router.get('/locked-seats/:showId', getLockedSeats)

export default router
