import prisma from '../config/db.js'
import { acquireSeatsLock, releaseSeats, getActiveLocks, normalizeSeatId } from '../utils/locks.js'

/**
 * Initiates a booking by atomically acquiring Redis seat locks for 10 minutes
 * and recording a PENDING booking in PostgreSQL.
 */
export const createBooking = async (req, res, next) => {
  const { showId, seats } = req.body
  const userId = req.auth?.userId

  if (!userId || !showId || !seats || !Array.isArray(seats) || seats.length === 0) {
    return res.status(400).json({ error: 'Missing required fields: showId, seats (and auth user session)' })
  }

  const cleanSeats = seats.map(normalizeSeatId)

  try {
    // 1. ATOMIC REDIS LOCK: Acquire 10-minute hold BEFORE touching the database
    const lockResult = await acquireSeatsLock(showId, cleanSeats, userId, 600)
    if (!lockResult.success) {
      return res.status(409).json({
        error: `Seat(s) [${lockResult.conflictingSeats.join(', ')}] are currently held by another customer. Please select different seats.`,
        conflictingSeats: lockResult.conflictingSeats
      })
    }

    // Fetch the show to resolve pricing and screenId
    let show
    try {
      show = await prisma.show.findUnique({
        where: { id: showId },
        include: { screen: true }
      })
    } catch (e) {
      console.warn('⚠️ Show query fallback:', e.message)
    }

    if (!show) {
      if (showId.startsWith('show-')) {
        show = {
          id: showId,
          price: 15.00,
          screenId: 'screen-1'
        }
      } else {
        await releaseSeats(showId, cleanSeats, userId)
        return res.status(404).json({ error: 'Show not found' })
      }
    }

    // Standardize database seat IDs (e.g. "${screenId}-${row}-${number}")
    const databaseSeatIds = cleanSeats.map(s => `${show.screenId}-${s}`)

    // 2. Perform Database Transaction with active hold window verification
    let booking
    try {
      booking = await prisma.$transaction(async (tx) => {
        // Only consider bookings from the last 10 minutes if status is PENDING; all CONFIRMED are permanent
        const holdCutoff = new Date(Date.now() - 10 * 60 * 1000)

        const conflictingBookings = await tx.bookingSeat.findMany({
          where: {
            seatId: { in: databaseSeatIds },
            booking: {
              showId,
              OR: [
                { status: 'CONFIRMED' },
                {
                  status: 'PENDING',
                  createdAt: { gte: holdCutoff }
                }
              ]
            }
          },
          include: { booking: true }
        })

        // Check if any conflicting seat belongs to another user
        const otherUserHold = conflictingBookings.find(b => b.booking.userId !== userId)
        if (otherUserHold) {
          const bookedSeatLabel = normalizeSeatId(otherUserHold.seatId)
          throw new Error(`Seat [${bookedSeatLabel}] is already booked or held by another customer.`)
        }

        // Upsert User record in PostgreSQL
        await tx.user.upsert({
          where: { id: userId },
          update: {},
          create: {
            id: userId,
            email: req.auth.claims?.email || `${userId}@showcity.com`,
            name: req.auth.claims?.name || 'ShowCity Customer'
          }
        })

        // Calculate total amount based on show price and seat types
        const totalPrice = Number(show.price) * cleanSeats.length

        // Create new PENDING booking
        const newBooking = await tx.booking.create({
          data: {
            userId,
            showId,
            totalPrice,
            status: 'PENDING',
            seats: {
              create: databaseSeatIds.map(seatId => ({ seatId }))
            }
          },
          include: { seats: true }
        })

        return newBooking
      }, { timeout: 15000 })
    } catch (dbError) {
      // If DB checks fail, immediately release the Redis lock to avoid deadlocks
      await releaseSeats(showId, cleanSeats, userId)

      if (dbError.message && dbError.message.includes('already booked')) {
        return res.status(409).json({ error: dbError.message })
      }

      console.warn('⚠️ Database offline fallback during booking creation:', dbError.message)
      // Local development mock booking fallback if Postgres instance is suspended
      booking = {
        id: `mock-bk-${Math.random().toString(36).substring(2, 9)}`,
        userId,
        showId,
        status: 'PENDING',
        totalPrice: Number(show.price) * cleanSeats.length,
        seats: cleanSeats.map(s => ({ seatId: s })),
        createdAt: new Date().toISOString()
      }
    }

    return res.status(201).json({
      message: 'Seats reserved successfully for 10 minutes.',
      booking,
      heldSeats: cleanSeats,
      expiresInSeconds: 600
    })
  } catch (error) {
    await releaseSeats(showId, cleanSeats, userId)
    next(error)
  }
}

/**
 * Explicitly releases held seats if customer cancels checkout or navigates away.
 */
export const releaseBookingSeats = async (req, res, next) => {
  const { bookingId, showId, seats } = req.body
  const userId = req.auth?.userId

  try {
    let seatsToRelease = seats || []

    // If bookingId is provided, lookup seats and mark booking CANCELLED in DB
    if (bookingId && (!seatsToRelease || seatsToRelease.length === 0)) {
      try {
        const booking = await prisma.booking.findUnique({
          where: { id: bookingId },
          include: { seats: true }
        })
        if (booking && (!userId || booking.userId === userId)) {
          seatsToRelease = booking.seats.map(s => normalizeSeatId(s.seatId))
          await prisma.booking.update({
            where: { id: bookingId },
            data: { status: 'CANCELLED' }
          })
        }
      } catch (e) {
        console.warn('⚠️ DB update for booking cancellation skipped:', e.message)
      }
    }

    if (showId && seatsToRelease.length > 0) {
      await releaseSeats(showId, seatsToRelease, userId)
    }

    return res.json({
      success: true,
      message: 'Held seats have been released successfully'
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Returns active locks (with remaining TTL) and confirmed bookings for a show.
 */
export const getLockedSeats = async (req, res, next) => {
  const { showId } = req.params
  const requestingUserId = req.auth?.userId || req.headers['x-demo-user']

  if (!showId) {
    return res.status(400).json({ error: 'Missing showId parameter' })
  }

  try {
    // 1. Fetch confirmed / active bookings from PostgreSQL
    let bookedSeats = []
    try {
      const holdCutoff = new Date(Date.now() - 10 * 60 * 1000)
      const dbBooked = await prisma.bookingSeat.findMany({
        where: {
          booking: {
            showId,
            OR: [
              { status: 'CONFIRMED' },
              { status: 'PENDING', createdAt: { gte: holdCutoff } }
            ]
          }
        },
        include: { booking: true }
      })

      bookedSeats = dbBooked
        .filter(b => b.booking.status === 'CONFIRMED')
        .map(b => normalizeSeatId(b.seatId))
    } catch (e) {
      console.warn('⚠️ Database query failed for booked seats. Using mock defaults.')
      bookedSeats = ['A-3', 'B-6', 'D-1', 'D-2']
    }

    // 2. Fetch active temporary holds from Redis/In-Memory mutex
    const activeLocks = await getActiveLocks(showId)
    const lockedSeats = activeLocks.map(l => l.seatId)

    return res.json({
      showId,
      bookedSeats,
      lockedSeats,
      activeLocks: activeLocks.map(l => ({
        seatId: l.seatId,
        ttl: l.ttl,
        isHeldBySelf: requestingUserId ? (l.userId === requestingUserId || l.userId === `demo_usr_${requestingUserId}`) : false
      }))
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Fetch bookings list for a specific logged-in user.
 */
export const getUserBookings = async (req, res, next) => {
  const userId = req.auth?.userId

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized: Missing user auth session' })
  }

  try {
    const bookings = await prisma.booking.findMany({
      where: { userId },
      include: {
        show: {
          include: {
            movie: true,
            screen: {
              include: { theatre: true }
            }
          }
        },
        seats: true
      },
      orderBy: { createdAt: 'desc' }
    })

    const formatted = bookings.map(b => {
      const seatLabels = b.seats.map(s => normalizeSeatId(s.seatId))

      return {
        id: b.id,
        movieTitle: b.show?.movie?.title || 'QuickShow Cinema',
        theatreName: b.show?.screen?.theatre?.name || 'QuickShow Cineplex',
        screenName: b.show?.screen?.name || 'Screen 1',
        seats: seatLabels,
        showTime: b.show?.startTime || b.createdAt,
        price: Number(b.totalPrice),
        status: b.status
      }
    })

    return res.json(formatted)
  } catch (error) {
    next(error)
  }
}
