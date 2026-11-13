import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...')

  // 1. Clean existing records (in order of relations)
  console.log('🧹 Cleaning existing data...')
  await prisma.payment.deleteMany()
  await prisma.showSeat.deleteMany()
  await prisma.bookingSeat.deleteMany()
  await prisma.booking.deleteMany()
  await prisma.show.deleteMany()
  await prisma.seat.deleteMany()
  await prisma.screen.deleteMany()
  await prisma.theatre.deleteMany()
  await prisma.movie.deleteMany()
  await prisma.user.deleteMany()

  // 2. Create Users
  console.log('👤 Creating default admin and users...')
  const adminUser = await prisma.user.create({
    data: {
      id: 'usr_clerk_mock_admin',
      email: 'admin@quickshow.com',
      name: 'System Admin',
      role: 'ADMIN',
    },
  })

  const regularUser = await prisma.user.create({
    data: {
      id: 'usr_clerk_mock_12345',
      email: 'user@quickshow.com',
      name: 'John Doe',
      role: 'USER',
    },
  })

  // 3. Create Movies
  console.log('🎬 Creating movies...')
  const movies = await Promise.all([
    prisma.movie.create({
      data: {
        id: 'm1',
        title: 'Gladiator II',
        description: 'Years after witnessing the death of the revered hero Maximus at the hands of his uncle, Lucius is forced to enter the Colosseum after his home is conquered by the tyrannical Emperors who now lead Rome with an iron fist.',
        duration: 148,
        genre: 'Action, Drama, History',
        rating: 'R',
        language: 'English',
        releaseDate: new Date('2024-11-22'),
        posterUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=600&q=80',
      },
    }),
    prisma.movie.create({
      data: {
        id: 'm2',
        title: 'Oppenheimer',
        description: 'The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb.',
        duration: 180,
        genre: 'Biography, Drama, History',
        rating: 'R',
        language: 'English',
        releaseDate: new Date('2023-07-21'),
        posterUrl: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=600&q=80',
      },
    }),
    prisma.movie.create({
      data: {
        id: 'm3',
        title: 'Dune: Part Two',
        description: 'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.',
        duration: 166,
        genre: 'Action, Adventure, Sci-Fi',
        rating: 'PG-13',
        language: 'English',
        releaseDate: new Date('2024-03-01'),
        posterUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80',
      },
    }),
  ])

  // 4. Create Theatres, Screens, and Seats
  console.log('🏛️ Creating theatres, screens, and physical seats...')
  const theatre = await prisma.theatre.create({
    data: {
      name: 'QuickShow Grand Cineplex',
      city: 'Mumbai',
      address: '4th Floor, Phoenix Palladium, Lower Parel',
    },
  })

  const screen1 = await prisma.screen.create({
    data: {
      name: 'Screen 1 (IMAX)',
      theatreId: theatre.id,
    },
  })

  const screen2 = await prisma.screen.create({
    data: {
      name: 'Screen 2 (Standard Dolby)',
      theatreId: theatre.id,
    },
  })

  // Create Seats helper: rows A to E, 8 seats per row
  const rows = ['A', 'B', 'C', 'D', 'E']
  const seatsPerRow = 8

  const getSeatType = (row) => {
    if (row === 'E') return 'VIP'
    if (row === 'C' || row === 'D') return 'PREMIUM'
    return 'STANDARD'
  }

  console.log('🪑 Populating seats grid for Screen 1...')
  for (const row of rows) {
    for (let num = 1; num <= seatsPerRow; num++) {
      await prisma.seat.create({
        data: {
          id: `${screen1.id}-${row}-${num}`,
          screenId: screen1.id,
          row,
          number: num,
          type: getSeatType(row),
        },
      })
    }
  }

  console.log('🪑 Populating seats grid for Screen 2...')
  for (const row of rows) {
    for (let num = 1; num <= seatsPerRow; num++) {
      await prisma.seat.create({
        data: {
          id: `${screen2.id}-${row}-${num}`,
          screenId: screen2.id,
          row,
          number: num,
          type: getSeatType(row),
        },
      })
    }
  }

  // 5. Create Shows
  console.log('📅 Scheduling shows...')
  
  // Set show times starting from today afternoon onwards
  const today = new Date()
  today.setHours(12, 0, 0, 0)

  const showTimes = [
    { hoursOffset: 2, screenId: screen1.id, price: 18.00, movieId: 'm1', id: 'show-1' },
    { hoursOffset: 5, screenId: screen1.id, price: 20.00, movieId: 'm2', id: 'show-2' },
    { hoursOffset: 8, screenId: screen1.id, price: 18.00, movieId: 'm3', id: 'show-3' },
    { hoursOffset: 3, screenId: screen2.id, price: 12.00, movieId: 'm3', id: 'show-4' },
    { hoursOffset: 6, screenId: screen2.id, price: 12.00, movieId: 'm1', id: 'show-5' },
  ]

  for (const showDetail of showTimes) {
    const startTime = new Date(today.getTime())
    startTime.setHours(today.getHours() + showDetail.hoursOffset)
    
    const movie = movies.find(m => m.id === showDetail.movieId)
    const durationMins = movie ? movie.duration : 120
    const endTime = new Date(startTime.getTime() + durationMins * 60 * 1000)

    const show = await prisma.show.create({
      data: {
        id: showDetail.id,
        movieId: showDetail.movieId,
        screenId: showDetail.screenId,
        startTime,
        endTime,
        price: showDetail.price,
      },
    })

    // Seed physical seats inventory for this show
    const screenSeats = await prisma.seat.findMany({
      where: { screenId: showDetail.screenId }
    })
    await prisma.showSeat.createMany({
      data: screenSeats.map(seat => ({
        showId: show.id,
        seatId: seat.id,
        status: 'AVAILABLE'
      })),
      skipDuplicates: true
    })
  }

  console.log('🎉 Seeding successfully completed!')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
