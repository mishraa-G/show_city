import { Link } from 'react-router-dom'
import { Film, User, Ticket, Settings } from 'lucide-react'
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react'

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-[#0d0e12]/75 border-b border-gray-800/60 px-6 py-4 transition-all duration-300">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <Film className="w-6 h-6 text-rose-500 group-hover:rotate-12 transition-transform duration-300" />
          <span className="text-xl font-bold bg-gradient-to-r from-rose-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent tracking-wider">
            QUICKSHOW
          </span>
        </Link>

        {/* Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
          <Link to="/" className="hover:text-rose-500 transition-colors flex items-center gap-1.5">
            <Film className="w-4 h-4" /> Home
          </Link>
          <Link to="/bookings" className="hover:text-rose-500 transition-colors flex items-center gap-1.5">
            <Ticket className="w-4 h-4" /> My Bookings
          </Link>
          <Link to="/admin" className="hover:text-rose-500 transition-colors flex items-center gap-1.5">
            <Settings className="w-4 h-4" /> Admin Panel
          </Link>
        </nav>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <Link
            to="/admin"
            className="hidden sm:inline-flex px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-rose-500 hover:text-white border border-rose-500/30 hover:bg-rose-500 rounded-lg transition-all duration-300"
          >
            Admin
          </Link>
          
          <SignedOut>
            <SignInButton mode="modal">
              <button className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-rose-500 to-violet-600 hover:from-rose-600 hover:to-violet-700 rounded-lg shadow-md hover:shadow-rose-500/20 active:scale-95 transition-all duration-150 cursor-pointer">
                <User className="w-4 h-4" />
                <span>Sign In</span>
              </button>
            </SignInButton>
          </SignedOut>
          
          <SignedIn>
            <UserButton appearance={{ elements: { avatarBox: 'w-8 h-8 border border-gray-800' } }} />
          </SignedIn>
        </div>
      </div>
    </header>
  )
}
