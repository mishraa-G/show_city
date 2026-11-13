import prisma from '../config/db.js'

export async function backfillShowSeats() {
  console.log('🔄 Starting ShowSeat backfill for existing shows...')

  const shows = await prisma.show.findMany({
    include: {
      screen: {
        include: {
          seats: true
        }
      },
      bookings: {
        include: {
          seats: true
        }
      }
    }
  })

  console.log(`Found ${shows.length} shows in database.`)

  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)
  let totalCreatedOrUpdated = 0

  for (const show of shows) {
    const seats = show.screen?.seats || []
    console.log(`Processing Show ${show.id} (Screen ${show.screen?.name || show.screenId}) with ${seats.length} seats...`)

    // Map existing active bookings by seatId
    const confirmedSeatToBooking = new Map()
    const pendingSeatToBooking = new Map()

    for (const booking of show.bookings) {
      if (booking.status === 'CONFIRMED') {
        for (const bs of booking.seats) {
          confirmedSeatToBooking.set(bs.seatId, booking)
        }
      } else if (booking.status === 'PENDING' && new Date(booking.createdAt) >= tenMinutesAgo) {
        for (const bs of booking.seats) {
          pendingSeatToBooking.set(bs.seatId, booking)
        }
      }
    }

    for (const seat of seats) {
      let status = 'AVAILABLE'
      let bookingId = null
      let lockedUntil = null

      if (confirmedSeatToBooking.has(seat.id)) {
        status = 'BOOKED'
        bookingId = confirmedSeatToBooking.get(seat.id).id
      } else if (pendingSeatToBooking.has(seat.id)) {
        status = 'HELD'
        const bk = pendingSeatToBooking.get(seat.id)
        bookingId = bk.id
        lockedUntil = new Date(new Date(bk.createdAt).getTime() + 10 * 60 * 1000)
      }

      await prisma.showSeat.upsert({
        where: {
          showId_seatId: {
            showId: show.id,
            seatId: seat.id
          }
        },
        update: {
          status,
          bookingId,
          lockedUntil
        },
        create: {
          showId: show.id,
          seatId: seat.id,
          status,
          bookingId,
          lockedUntil
        }
      })
      totalCreatedOrUpdated++
    }
  }

  console.log(`✅ Backfill complete! Processed ${totalCreatedOrUpdated} ShowSeat rows.`)
}

// Execute directly if run as main script
if (process.argv[1] && process.argv[1].endsWith('backfillShowSeats.js')) {
  backfillShowSeats()
    .then(async () => {
      await prisma.$disconnect()
      process.exit(0)
    })
    .catch(async (e) => {
      console.error('❌ Backfill failed:', e)
      await prisma.$disconnect()
      process.exit(1)
    })
}

