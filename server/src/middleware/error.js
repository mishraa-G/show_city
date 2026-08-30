export const errorHandler = (err, req, res, next) => {
  console.error('❌ Error caught by global handler:', err)

  // Prisma Client Known Request Errors (e.g. constraint violations)
  if (err.code && err.code.startsWith('P2')) {
    if (err.code === 'P2002') {
      return res.status(409).json({
        error: 'Conflict error: A record with this unique field already exists.',
        target: err.meta?.target
      })
    }
    if (err.code === 'P2025') {
      return res.status(404).json({
        error: 'Record not found in the database.'
      })
    }
  }

  // Fallback generic response
  const statusCode = err.statusCode || 500
  const message = err.message || 'Internal Server Error'

  res.status(statusCode).json({
    error: message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack
  })
}
