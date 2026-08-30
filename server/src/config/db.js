import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Verify DB connectivity when imported in development (optional, non-blocking)
prisma.$connect()
  .then(() => {
    console.log('🔌 PostgreSQL connected successfully via Prisma Client')
  })
  .catch((err) => {
    console.warn('⚠️ Warning: Prisma Client initialized but could not connect to PostgreSQL database. Make sure DATABASE_URL is set in your .env file.')
  })

export default prisma
