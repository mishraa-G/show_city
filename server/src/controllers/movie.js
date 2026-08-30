import prisma from '../config/db.js'
import { getCachedOrFetch } from '../utils/cache.js'

const MOCK_MOVIES = [
  {
    id: "m1",
    title: "Interstellar: The Re-Release",
    description: "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
    duration: 169,
    genre: "Sci-Fi / Adventure",
    rating: "9.0",
    language: "English",
    releaseDate: new Date("2014-11-07").toISOString(),
    posterUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=600&auto=format&fit=crop"
  },
  {
    id: "m2",
    title: "Neon Nights 2026",
    description: "In a cybernetic future, a detective uncovers a conspiracy that threatens the digital grid of Neo-Tokyo.",
    duration: 124,
    genre: "Action / Cyberpunk",
    rating: "8.4",
    language: "English",
    releaseDate: new Date("2026-03-12").toISOString(),
    posterUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=600&auto=format&fit=crop"
  },
  {
    id: "m3",
    title: "The Silent Horizon",
    description: "A psychological mystery set in an isolated Antarctic research station during the polar night.",
    duration: 115,
    genre: "Drama / Mystery",
    rating: "7.9",
    language: "English / Swedish",
    releaseDate: new Date("2025-10-24").toISOString(),
    posterUrl: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?q=80&w=600&auto=format&fit=crop"
  }
]

export const getMovies = async (req, res, next) => {
  try {
    const fetchMovies = async () => {
      const dbMovies = await prisma.movie.findMany()
      return dbMovies.length > 0 ? dbMovies : MOCK_MOVIES
    }

    const movies = await getCachedOrFetch('movies:list', fetchMovies, 300)
    return res.json(movies)
  } catch (error) {
    console.warn('⚠️ Database query failed (Postgres likely offline). Falling back to mock movies list.')
    return res.json(MOCK_MOVIES)
  }
}

export const getMovieById = async (req, res, next) => {
  const { id } = req.params
  try {
    const fetchMovie = async () => {
      const movie = await prisma.movie.findUnique({
        where: { id },
        include: {
          shows: {
            include: {
              screen: {
                include: {
                  theatre: true
                }
              }
            }
          }
        }
      })
      if (!movie) {
        const mockMovie = MOCK_MOVIES.find(m => m.id === id)
        if (mockMovie) {
          return getMockMovieSchedule(mockMovie)
        }
        throw new Error('Movie not found')
      }
      return movie
    }

    const movieDetails = await getCachedOrFetch(`movie:details:${id}`, fetchMovie, 120)
    return res.json(movieDetails)
  } catch (error) {
    if (error.message === 'Movie not found') {
      return res.status(404).json({ error: 'Movie not found' })
    }
    console.warn(`⚠️ Database query for movie ID ${id} failed. Falling back to mock details.`)
    const mockMovie = MOCK_MOVIES.find(m => m.id === id) || MOCK_MOVIES[0]
    return res.json(getMockMovieSchedule(mockMovie))
  }
}

const getMockMovieSchedule = (movie) => {
  return {
    ...movie,
    shows: [
      {
        id: "show-1",
        movieId: movie.id,
        screenId: "screen-1",
        startTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        price: 12.50,
        screen: {
          id: "screen-1",
          name: "Screen 1 (IMAX)",
          theatreId: "theatre-1",
          theatre: {
            id: "theatre-1",
            name: "Grand Cinema Center",
            city: "Metropolis",
            address: "100 Broadway Ave"
          }
        }
      },
      {
        id: "show-2",
        movieId: movie.id,
        screenId: "screen-2",
        startTime: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString(),
        price: 10.00,
        screen: {
          id: "screen-2",
          name: "Screen 2 (Standard)",
          theatreId: "theatre-1",
          theatre: {
            id: "theatre-1",
            name: "Grand Cinema Center",
            city: "Metropolis",
            address: "100 Broadway Ave"
          }
        }
      }
    ]
  }
}
