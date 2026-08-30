import { useState } from 'react'
import { Plus, LayoutGrid, Calendar, DollarSign, Users, Film, PlusCircle } from 'lucide-react'

interface SimpleStat {
  label: string
  value: string
  icon: React.ReactNode
  color: string
}

export default function AdminDashboard() {
  const [activeView, setActiveView] = useState<'analytics' | 'add-movie'>('analytics')

  // Form states
  const [movieTitle, setMovieTitle] = useState('')
  const [genre, setGenre] = useState('')
  const [duration, setDuration] = useState('120')
  const [rating, setRating] = useState('8.0')
  const [posterUrl, setPosterUrl] = useState('')
  const [description, setDescription] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const statsList: SimpleStat[] = [
    {
      label: "Total Revenue",
      value: "$4,875.50",
      icon: <DollarSign className="w-5 h-5 text-emerald-400" />,
      color: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
    },
    {
      label: "Seats Reserved",
      value: "192 Seats",
      icon: <Users className="w-5 h-5 text-violet-400" />,
      color: "bg-violet-500/10 border-violet-500/20 text-violet-400"
    },
    {
      label: "Active Shows",
      value: "42 Screening",
      icon: <Calendar className="w-5 h-5 text-rose-400" />,
      color: "bg-rose-500/10 border-rose-500/20 text-rose-400"
    },
    {
      label: "Total Movies",
      value: "4 Titles",
      icon: <Film className="w-5 h-5 text-amber-400" />,
      color: "bg-amber-500/10 border-amber-500/20 text-amber-400"
    }
  ]

  const handleAddMovie = (e: React.FormEvent) => {
    e.preventDefault()
    setSuccessMsg('Movie created successfully in local database sandbox!')
    // Reset form
    setMovieTitle('')
    setGenre('')
    setDuration('120')
    setPosterUrl('')
    setDescription('')
    
    setTimeout(() => {
      setSuccessMsg('')
      setActiveView('analytics')
    }, 2000)
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Admin Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">Configure cinema theatres, schedule shows, and track sales</p>
        </div>

        {/* Tab triggers */}
        <div className="bg-gray-950 p-1 rounded-lg border border-gray-800 flex self-start sm:self-auto text-xs font-semibold">
          <button
            onClick={() => setActiveView('analytics')}
            className={`px-4 py-2 rounded-md transition-all flex items-center gap-1.5 ${
              activeView === 'analytics' ? 'bg-rose-500 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            <LayoutGrid className="w-4 h-4" /> Analytics Overview
          </button>
          <button
            onClick={() => setActiveView('add-movie')}
            className={`px-4 py-2 rounded-md transition-all flex items-center gap-1.5 ${
              activeView === 'add-movie' ? 'bg-rose-500 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Plus className="w-4 h-4" /> Add Movie
          </button>
        </div>
      </div>

      {activeView === 'analytics' ? (
        // Analytics view
        <div className="space-y-8 animate-fadeIn">
          {/* Stats blocks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {statsList.map((stat, i) => (
              <div
                key={i}
                className="bg-[#15161e] border border-gray-800 p-6 rounded-2xl flex items-center justify-between shadow-lg"
              >
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">{stat.label}</p>
                  <p className="text-2xl font-extrabold text-white">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-xl border ${stat.color.split(' ')[0]} ${stat.color.split(' ')[1]}`}>
                  {stat.icon}
                </div>
              </div>
            ))}
          </div>

          {/* Revenue Chart Visual mockup */}
          <div className="bg-[#15161e] border border-gray-800 rounded-2xl p-6 shadow-lg space-y-4">
            <div>
              <h3 className="text-lg font-bold text-white">Sales Performance</h3>
              <p className="text-xs text-gray-400">Weekly ticket transactions volume breakdown</p>
            </div>
            
            {/* Chart Bars */}
            <div className="h-48 flex items-end justify-between gap-4 pt-8 px-4 border-b border-gray-800">
              {[60, 45, 80, 55, 95, 30, 75].map((height, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer">
                  {/* Tooltip on hover */}
                  <span className="text-[10px] font-bold text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    ${height * 10}
                  </span>
                  <div
                    className="w-full bg-gradient-to-t from-violet-600 to-rose-500 rounded-t-md group-hover:from-violet-500 group-hover:to-rose-400 transition-all duration-300"
                    style={{ height: `${height}%` }}
                  ></div>
                  <span className="text-[10px] text-gray-500 uppercase font-bold mt-2 font-mono">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        // Add Movie Form
        <div className="bg-[#15161e] border border-gray-800 rounded-2xl p-6 max-w-2xl mx-auto shadow-xl">
          <div className="flex items-center gap-2 border-b border-gray-800 pb-4 mb-6">
            <PlusCircle className="w-5 h-5 text-rose-500" />
            <h3 className="text-lg font-bold text-white">Register a New Film</h3>
          </div>

          <form onSubmit={handleAddMovie} className="space-y-6">
            {successMsg && (
              <div className="p-4 text-sm bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-center font-semibold">
                {successMsg}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Movie Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Interstellar"
                  value={movieTitle}
                  onChange={(e) => setMovieTitle(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-800 rounded-lg py-2.5 px-4 text-sm text-gray-300 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Genre</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sci-Fi / Adventure"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-800 rounded-lg py-2.5 px-4 text-sm text-gray-300 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Duration (minutes)</label>
                <input
                  type="number"
                  required
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-800 rounded-lg py-2.5 px-4 text-sm text-gray-300 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Rating (IMDb)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 8.8"
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-800 rounded-lg py-2.5 px-4 text-sm text-gray-300 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Poster Image URL</label>
                <input
                  type="url"
                  required
                  placeholder="https://images.unsplash.com/photo-..."
                  value={posterUrl}
                  onChange={(e) => setPosterUrl(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-800 rounded-lg py-2.5 px-4 text-sm text-gray-300 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Overview Description</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Summarize the storyline..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-800 rounded-lg py-2.5 px-4 text-sm text-gray-300 focus:outline-none focus:border-rose-500"
                ></textarea>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-rose-500 to-violet-600 hover:from-rose-600 hover:to-violet-700 text-white font-bold rounded-xl shadow-lg transition-all duration-150"
            >
              Add Movie to Catalog
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
