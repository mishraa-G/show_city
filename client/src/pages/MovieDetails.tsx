import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Calendar, Clock, Globe, ArrowLeft, Loader, MapPin } from 'lucide-react'
import { fetchMovieById, type MovieDetails as MovieDetailsType } from '../services/api'

export default function MovieDetails() {
  const { id } = useParams<{ id: string }>()
  const [movie, setMovie] = useState<MovieDetailsType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (id) {
      fetchMovieById(id)
        .then((data) => {
          setMovie(data)
          setLoading(false)
        })
        .catch((err) => {
          setError(err.message)
          setLoading(false)
        })
    }
  }, [id])

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-rose-500 gap-2">
        <Loader className="w-8 h-8 animate-spin" />
        <p className="font-semibold">Loading movie details & schedules...</p>
      </div>
    )
  }

  if (error || !movie) {
    return (
      <div className="max-w-xl mx-auto my-12 p-6 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-center">
        <p className="font-bold">Error loading details</p>
        <p className="text-sm mt-1">{error || 'Movie not found'}</p>
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-rose-400 hover:text-white mt-4 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
        </Link>
      </div>
    )
  }

  // Format date helper
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatShowTime = (timeStr: string) => {
    return new Date(timeStr).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-12">
      {/* Back button */}
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-rose-500 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Home
      </Link>

      {/* Movie Details Hero Banner */}
      <div className="flex flex-col md:flex-row gap-8 bg-[#15161e] border border-gray-800/80 rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
        {/* Decorative ambient color */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-rose-500/10 rounded-full blur-[100px] pointer-events-none"></div>

        {/* Poster Image */}
        <div className="w-full md:w-72 shrink-0 aspect-[3/4] rounded-xl overflow-hidden shadow-lg border border-gray-800">
          <img src={movie.posterUrl} alt={movie.title} className="w-full h-full object-cover" />
        </div>

        {/* Details Details Details */}
        <div className="flex-1 space-y-6">
          <div className="space-y-3">
            <span className="px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-semibold uppercase tracking-wider">
              {movie.genre}
            </span>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
              {movie.title}
            </h1>
          </div>

          <p className="text-gray-400 text-sm md:text-base leading-relaxed max-w-3xl">
            {movie.description}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-gray-800/60 max-w-2xl text-xs sm:text-sm">
            <div className="flex items-center gap-2 text-gray-300">
              <Clock className="w-4.5 h-4.5 text-rose-500" />
              <div>
                <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">Duration</p>
                <p className="font-medium">{movie.duration} Minutes</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-gray-300">
              <Globe className="w-4.5 h-4.5 text-rose-500" />
              <div>
                <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">Language</p>
                <p className="font-medium">{movie.language}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-gray-300 col-span-2 sm:col-span-1">
              <Calendar className="w-4.5 h-4.5 text-rose-500" />
              <div>
                <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">Release Date</p>
                <p className="font-medium">{formatDate(movie.releaseDate)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Showtimes Listings */}
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Select a Showtime</h2>
          <p className="text-gray-400 text-sm mt-1">Schedules for screens across available theaters</p>
        </div>

        {movie.shows && movie.shows.length > 0 ? (
          <div className="space-y-6">
            {/* Grouping shows by theatre */}
            {/* For development mock fallback, shows list is mapped below: */}
            <div className="bg-[#15161e] border border-gray-800/60 rounded-xl p-6 space-y-6">
              {movie.shows.map((show) => (
                <div
                  key={show.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-800/40 pb-6 last:border-b-0 last:pb-0 gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <h4 className="font-bold text-white text-base">
                        {show.screen.theatre.name}
                      </h4>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-rose-500" />
                        {show.screen.theatre.city}
                      </span>
                      <span>•</span>
                      <span className="font-semibold text-rose-400">
                        {show.screen.name}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Price from</p>
                      <p className="text-lg font-extrabold text-white">${Number(show.price).toFixed(2)}</p>
                    </div>

                    <Link
                      to={`/seats/${show.id}`}
                      className="px-6 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs rounded-lg shadow-md hover:shadow-rose-500/20 active:scale-95 transition-all duration-150"
                    >
                      {formatShowTime(show.startTime)}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-[#15161e] border border-gray-800/40 p-12 text-center rounded-xl text-gray-500 text-sm">
            No shows currently scheduled for this movie. Check back later!
          </div>
        )}
      </section>
    </div>
  )
}
