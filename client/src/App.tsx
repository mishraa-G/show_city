import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import MovieDetails from './pages/MovieDetails'
import SeatSelection from './pages/SeatSelection'
import Checkout from './pages/Checkout'
import Bookings from './pages/Bookings'
import AdminDashboard from './pages/AdminDashboard'

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-[#0d0e12] text-gray-100 font-sans selection:bg-rose-500 selection:text-white overflow-x-hidden relative flex flex-col justify-between">
        {/* Glow Effects */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-rose-500/10 rounded-full blur-[120px] pointer-events-none z-0"></div>
        <div className="absolute top-10 right-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-[120px] pointer-events-none z-0"></div>

        <div className="z-10 flex flex-col flex-1">
          {/* Header Navigation */}
          <Navbar />

          {/* Main App Routes */}
          <main className="flex-1 max-w-7xl mx-auto w-full">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/movie/:id" element={<MovieDetails />} />
              <Route path="/seats/:showId" element={<SeatSelection />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/bookings" element={<Bookings />} />
              <Route path="/admin" element={<AdminDashboard />} />
            </Routes>
          </main>
        </div>

        {/* Global Footer */}
        <footer className="bg-gray-950 border-t border-gray-900 py-8 px-6 mt-16 z-10 shrink-0">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
            <div>
              <p>&copy; {new Date().getFullYear()} QuickShow. All rights reserved.</p>
              <p className="text-gray-600 mt-0.5">Built with React, React Router, Node, Express, Prisma & Tailwind v4</p>
            </div>
            <div className="flex items-center gap-6">
              <a href="#" className="hover:text-rose-400 transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-rose-400 transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-rose-400 transition-colors">Support</a>
            </div>
          </div>
        </footer>
      </div>
    </Router>
  )
}
