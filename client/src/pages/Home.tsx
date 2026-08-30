import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Search, Star, Film, Calendar, RefreshCw } from 'lucide-react'
import { fetchMovies, type Movie } from '../services/api'

export default function Home() {
  const [movies, setMovies] = useState<Movie[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'showing' | 'coming'>('showing')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchMovies()
      .then((data) => {
        setMovies(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  const filteredMovies = movies.filter((movie) => {
    const matchesSearch = movie.title.toLowerCase().includes(searchQuery.toLowerCase())
    
    // In our backend database we have mock movies that can have release dates
    // For simple UI segmentation:
    // If releaseDate is in the future, it is "Coming Soon", else "Now Showing"
    const isFuture = new Date(movie.releaseDate).getTime() > Date.now()
    const matchesTab = activeTab === 'showing' ? !isFuture : isFuture

    return matchesSearch && matchesTab
  })

  return (
    <div className="relative">
      {/* Hero Section */}
      <section className="relative px-6 pt-16 pb-20 text-center md:text-left md:flex md:items-center md:justify-between gap-12 max-w-7xl mx-auto">
        <div className="flex-1 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
            Real-time API Synchronized
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight tracking-tight">
            Book Tickets For Your{' '}
            <span className="bg-gradient-to-r from-rose-500 via-pink-500 to-violet-500 bg-clip-text text-transparent">
              Favorite Movies
            </span>{' '}
            In Seconds
          </h1>

          <p className="text-gray-400 text-base sm:text-lg max-w-2xl">
            Experience transactional seat booking with lightning-fast Redis locking, secured Clerk authentication, and flawless Stripe checkouts.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center md:justify-start gap-4">
            <a
              href="#explore"
              className="w-full sm:w-auto text-center px-8 py-3.5 bg-gradient-to-r from-rose-500 to-violet-600 text-white font-bold rounded-lg shadow-lg hover:shadow-rose-500/30 hover:scale-[1.02] active:scale-95 transition-all duration-200"
            >
              Explore Movies
            </a>
          </div>
        </div>

        {/* Hero Interactive Preview */}
        <div className="flex-1 mt-12 md:mt-0 relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-rose-500 to-violet-600 rounded-2xl blur-lg opacity-30 group-hover:opacity-40 transition duration-500"></div>
          <div className="relative bg-[#15161e] border border-gray-800 rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-gray-800/60 pb-3">
              <div>
                <h3 className="text-lg font-bold">Redis-Based Locks</h3>
                <p className="text-xs text-gray-400">Atomic 10 minute temporary hold</p>
              </div>
              <span className="text-xs font-mono px-2 py-1 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                10:00 MINS
              </span>
            </div>

            <div className="grid grid-cols-6 gap-2">
              {Array.from({ length: 18 }).map((_, i) => {
                const isSelected = i === 8 || i === 9
                const isReserved = i === 3 || i === 14
                return (
                  <div
                    key={i}
                    className={`aspect-square rounded flex items-center justify-center text-[10px] font-bold transition-all duration-150 ${
                      isSelected
                        ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
                        : isReserved
                        ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                        : 'bg-[#222431] text-gray-400'
                    }`}
                  >
                    {String.fromCharCode(65 + Math.floor(i / 6))}
                    {(i % 6) + 1}
                  </div>
                )
              })}
            </div>

            <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-800/60">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-rose-500"></span> Selected
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-gray-800"></span> Reserved
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-[#222431]"></span> Available
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Exploration Grid */}
      <section id="explore" className="max-w-7xl mx-auto px-6 py-12 border-t border-gray-800/60 scroll-mt-24">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Featured Movies</h2>
            <p className="text-gray-400 text-sm mt-1">Discover what's trending and secure your seats today</p>
          </div>

          <div className="flex items-center gap-4 self-start md:self-auto">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search movies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 pl-10 pr-4 py-2 text-sm bg-gray-900 border border-gray-800 rounded-lg focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all text-gray-200"
              />
              <Search className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
            </div>

            {/* Toggle tabs */}
            <div className="bg-gray-950 p-1 rounded-lg border border-gray-800 flex">
              <button
                onClick={() => setActiveTab('showing')}
                className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  activeTab === 'showing' ? 'bg-rose-500 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Now Showing
              </button>
              <button
                onClick={() => setActiveTab('coming')}
                className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  activeTab === 'coming' ? 'bg-rose-500 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Coming Soon
              </button>
            </div>
          </div>
        </div>

        {/* Loading and Errors */}
        {loading && (
          <div className="flex items-center justify-center py-20 text-rose-500 gap-2">
            <RefreshCw className="w-6 h-6 animate-spin" />
            <span className="font-semibold">Loading movie lists...</span>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg text-center my-6">
            Error: {error}. Backend may be offline. Try starting backend node server first.
          </div>
        )}

        {/* Movies Grid */}
        {!loading && !error && (
          filteredMovies.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
              {filteredMovies.map((movie) => (
                <div
                  key={movie.id}
                  className="group bg-[#15161e] border border-gray-800/60 rounded-xl overflow-hidden hover:border-gray-700/80 transition-all duration-300 hover:-translate-y-1 shadow-md hover:shadow-xl"
                >
                  <div className="relative aspect-[3/4] overflow-hidden">
                    <img
                      src={movie.posterUrl}
                      alt={movie.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 right-3 bg-gray-950/85 backdrop-blur-md px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide text-rose-400 border border-rose-500/20 flex items-center gap-1">
                      <Star className="w-3 h-3 text-rose-500 fill-rose-500" />
                      <span>{movie.rating}</span>
                    </div>
                  </div>
                  <div className="p-5 space-y-3">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-rose-500">
                      {movie.genre}
                    </span>
                    <h3 className="font-bold text-lg leading-snug line-clamp-1 group-hover:text-rose-400 transition-colors">
                      {movie.title}
                    </h3>
                    <p className="text-xs text-gray-500 line-clamp-2">
                      {movie.description}
                    </p>
                    <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-800/40">
                      <span className="flex items-center gap-1"><Film className="w-3.5 h-3.5" /> {movie.duration}m</span>
                      <Link
                        to={`/movie/${movie.id}`}
                        className="px-4 py-2 bg-gray-800 hover:bg-rose-500 text-gray-200 hover:text-white text-xs font-bold rounded-lg transition-all duration-200 flex items-center gap-1"
                      >
                        <Calendar className="w-3.5 h-3.5" /> Book Show
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 text-gray-500">
              No movies match your filter query.
            </div>
          )
        )}
      </section>
    </div>
  )
}
