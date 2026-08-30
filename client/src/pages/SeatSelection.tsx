import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Ticket, CreditCard, Lock, UserCheck, ShieldAlert, Sparkles } from 'lucide-react'
import {
  createBooking,
  fetchLockedSeats,
  getActiveDemoUser,
  setActiveDemoUser,
  getActiveHold,
  clearActiveHold,
  releaseBooking,
  type ActiveSeatLock,
  type ActiveHold
} from '../services/api'
import { useAuth, useUser } from '@clerk/clerk-react'

interface Seat {
  id: string
  row: string
  number: number
  type: 'STANDARD' | 'PREMIUM' | 'VIP'
  price: number
  isBooked: boolean
  isLocked?: boolean
  lockTtl?: number
  isHeldBySelf?: boolean
}

export default function SeatSelection() {
  const { showId } = useParams<{ showId: string }>()
  const navigate = useNavigate()
  const [selectedSeats, setSelectedSeats] = useState<string[]>([])
  const [bookingLoading, setBookingLoading] = useState(false)
  const [bookingError, setBookingError] = useState('')

  const { getToken, isSignedIn } = useAuth()
  const { user } = useUser()

  // Demo Concurrency Switcher State (for interview testing across 2 tabs)
  const [demoUser, setDemoUserState] = useState<string>(getActiveDemoUser() || 'alice')

  const [bookedSeats, setBookedSeats] = useState<string[]>([])
  const [activeLocks, setActiveLocks] = useState<ActiveSeatLock[]>([])
  const [activeHold, setActiveHold] = useState<ActiveHold | null>(getActiveHold())

  const rows = ['A', 'B', 'C', 'D', 'E']
  const seatsPerRow = 8

  const handleDemoUserChange = (newUser: string) => {
    setActiveDemoUser(newUser)
    setDemoUserState(newUser)
    setSelectedSeats([])
    setBookingError('')
  }

  const handleReleaseActiveHold = async () => {
    if (!activeHold) return
    try {
      const token = await getToken()
      await releaseBooking(activeHold.bookingId, activeHold.showId, activeHold.seats, token)
      clearActiveHold()
      setActiveHold(null)
      loadSeats()
    } catch {
      clearActiveHold()
      setActiveHold(null)
      loadSeats()
    }
  }

  const getSeatType = (row: string) => {
    if (row === 'E') return 'VIP'
    if (row === 'C' || row === 'D') return 'PREMIUM'
    return 'STANDARD'
  }

  const getSeatPrice = (type: 'STANDARD' | 'PREMIUM' | 'VIP') => {
    if (type === 'VIP') return 25.0
    if (type === 'PREMIUM') return 18.0
    return 12.0
  }

  const loadSeats = useCallback(async () => {
    if (!showId) return
    try {
      const token = await getToken()
      const data = await fetchLockedSeats(showId, token)
      setBookedSeats(data.bookedSeats || [])
      setActiveLocks(data.activeLocks || [])

      // If any of the user's currently selected seats was locked by someone else, deselect it
      if (data.lockedSeats && data.lockedSeats.length > 0) {
        setSelectedSeats(prev => {
          const contested = prev.filter(s => data.lockedSeats.includes(s))
          if (contested.length > 0) {
            setBookingError(`Seat(s) [${contested.join(', ')}] were just held by another customer!`)
            return prev.filter(s => !data.lockedSeats.includes(s))
          }
          return prev
        })
      }
    } catch (err) {
      console.warn('Seat refresh warning:', err)
    }
  }, [showId, getToken])

  useEffect(() => {
    loadSeats()
    // Poll every 2.5 seconds for real-time seat lock synchronization
    const interval = setInterval(loadSeats, 2500)
    return () => clearInterval(interval)
  }, [loadSeats])

  const lockedSeatIds = activeLocks.map(l => l.seatId)

  const seatsGrid: Seat[] = []
  rows.forEach((row) => {
    for (let number = 1; number <= seatsPerRow; number++) {
      const id = `${row}-${number}`
      const type = getSeatType(row)
      const price = getSeatPrice(type)
      const isBooked = bookedSeats.includes(id)
      const isLocked = lockedSeatIds.includes(id)
      const lockData = activeLocks.find(l => l.seatId === id)
      seatsGrid.push({
        id,
        row,
        number,
        type,
        price,
        isBooked,
        isLocked,
        lockTtl: lockData?.ttl,
        isHeldBySelf: lockData?.isHeldBySelf
      })
    }
  })

  const handleSeatClick = (seatId: string, isBooked: boolean, isLocked?: boolean) => {
    if (isBooked || isLocked) return
    setBookingError('')

    setSelectedSeats((prev) =>
      prev.includes(seatId)
        ? prev.filter((id) => id !== seatId)
        : [...prev, seatId]
    )
  }

  const handleBookingSubmit = async () => {
    if (selectedSeats.length === 0 || !showId) return

    setBookingLoading(true)
    setBookingError('')

    try {
      const token = await getToken()
      const effectiveUserId = user?.id || `demo_usr_${demoUser}`

      const response = await createBooking(effectiveUserId, showId, selectedSeats, token)
      
      // Redirect to Checkout page with 10-minute hold active
      navigate(`/checkout?booking_id=${response.booking.id}&show_id=${showId}`)
    } catch (err: any) {
      setBookingError(err.message || 'Failed to acquire seat locks.')
      // Immediately refresh seats to show newly contested locks
      loadSeats()
      setBookingLoading(false)
    }
  }

  const totalCost = selectedSeats.reduce((sum, seatId) => {
    const seat = seatsGrid.find((s) => s.id === seatId)
    return sum + (seat ? seat.price : 0)
  }, 0)

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      {/* Header Navigation & Concurrency Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800/80 pb-4">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-rose-500 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Movies
        </Link>

        {/* Demo Interview Concurrency Switcher */}
        <div className="flex items-center gap-3 bg-[#15161e] border border-gray-800 px-4 py-2 rounded-xl text-xs">
          <span className="text-gray-400 font-semibold flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Interview Concurrency Mode:
          </span>

          {isSignedIn && user ? (
            <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <UserCheck className="w-3.5 h-3.5" />
              <span>{user.fullName || user.primaryEmailAddress?.emailAddress}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-gray-900/80 p-1 rounded-lg border border-gray-800">
              <button
                onClick={() => handleDemoUserChange('alice')}
                className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                  demoUser === 'alice'
                    ? 'bg-rose-500 text-white shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                👤 User 1 (Alice)
              </button>
              <button
                onClick={() => handleDemoUserChange('bob')}
                className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                  demoUser === 'bob'
                    ? 'bg-violet-600 text-white shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                👤 User 2 (Bob)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Active Reservation In Progress Alert Banner */}
      {activeHold && activeHold.showId === showId && (
        <div className="bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-amber-500/15 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">
                You currently have a reservation held for Seat(s):{' '}
                <span className="font-mono text-amber-400 font-extrabold">{activeHold.seats.join(', ')}</span>
              </p>
              <p className="text-[11px] text-gray-400">
                Walked out of payments? You can release these seats now or resume checkout before expiration.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
            <button
              onClick={handleReleaseActiveHold}
              className="flex-1 sm:flex-none px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 font-bold text-xs rounded-xl transition cursor-pointer"
            >
              ❌ Release Seats Now
            </button>
            <Link
              to={`/checkout?booking_id=${activeHold.bookingId}&show_id=${activeHold.showId}`}
              className="flex-1 sm:flex-none px-4 py-2 bg-gradient-to-r from-rose-500 to-violet-600 hover:from-rose-600 hover:to-violet-700 text-white font-bold text-xs rounded-xl shadow transition text-center cursor-pointer"
            >
              💳 Resume Payment
            </Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Seating Map Grid layout */}
        <div className="lg:col-span-2 bg-[#15161e] border border-gray-800/80 rounded-2xl p-8 flex flex-col items-center relative overflow-hidden">
          {/* Ambient light screen glow */}
          <div className="absolute top-[-50px] w-[90%] h-24 bg-gradient-to-b from-rose-500/10 to-transparent blur-xl pointer-events-none"></div>

          {/* Theater Arch Screen */}
          <div className="w-[85%] text-center space-y-2 mb-12">
            <div className="h-[4px] bg-gradient-to-r from-rose-500 via-purple-500 to-indigo-500 rounded-full shadow-lg shadow-rose-500/50"></div>
            <p className="text-[10px] text-gray-500 uppercase tracking-[0.3em] font-semibold">Cinema Screen This Way</p>
          </div>

          {/* Seats map */}
          <div className="grid grid-cols-8 gap-3 sm:gap-4 max-w-md w-full">
            {seatsGrid.map((seat) => {
              const isSelected = selectedSeats.includes(seat.id)
              const displayLabel = `${seat.row}${seat.number}`
              const isDisabled = seat.isBooked || seat.isLocked

              return (
                <button
                  key={seat.id}
                  disabled={isDisabled}
                  onClick={() => handleSeatClick(seat.id, seat.isBooked, seat.isLocked)}
                  className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs font-bold transition-all duration-150 relative group ${
                    seat.isBooked
                      ? 'bg-gray-900/90 text-gray-600 cursor-not-allowed border border-gray-800'
                      : seat.isLocked
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50 cursor-not-allowed shadow-md shadow-amber-500/10'
                      : isSelected
                      ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/35 border border-rose-400 hover:bg-rose-600 scale-[1.05]'
                      : seat.type === 'VIP'
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30'
                      : seat.type === 'PREMIUM'
                      ? 'bg-violet-500/10 text-violet-400 border border-violet-500/30 hover:bg-violet-500/30'
                      : 'bg-rose-500/5 text-gray-400 border border-gray-800 hover:border-gray-700 hover:bg-rose-500/10'
                  }`}
                >
                  {seat.isLocked ? (
                    <Lock className="w-3.5 h-3.5 animate-pulse text-amber-400" />
                  ) : (
                    <span>{displayLabel}</span>
                  )}

                  {/* Seat Hover Tooltip */}
                  <span className="absolute bottom-[115%] left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-gray-950 text-[9px] font-bold pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-gray-800 shadow-md z-20">
                    {seat.isBooked ? (
                      <span className="text-gray-500">Booked</span>
                    ) : seat.isLocked ? (
                      <span className="text-amber-400">Held by another customer ({seat.lockTtl || 600}s)</span>
                    ) : (
                      <span className="text-rose-400">${seat.price}</span>
                    )}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Seat Tiers Legend */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-gray-400 mt-12 border-t border-gray-800/40 pt-6 w-full">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border border-gray-800 bg-rose-500/5"></div>
              <span>Standard ($12)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border border-violet-500/30 bg-violet-500/10"></div>
              <span>Premium ($18)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border border-amber-500/30 bg-amber-500/10"></div>
              <span>VIP ($25)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-rose-500"></div>
              <span>Selected</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border border-amber-500/50 bg-amber-500/20 flex items-center justify-center">
                <Lock className="w-2.5 h-2.5 text-amber-400" />
              </div>
              <span className="text-amber-400 font-medium">Locked (10m Hold)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gray-900 border border-gray-800"></div>
              <span>Booked</span>
            </div>
          </div>
        </div>

        {/* Checkout Summary panel */}
        <div className="bg-[#15161e] border border-gray-800/80 rounded-2xl p-6 h-fit space-y-6 shadow-2xl">
          <div>
            <h3 className="text-lg font-bold text-white">Reservation Summary</h3>
            <p className="text-xs text-gray-400">Pessimistic Redis locking reserves your seats for 10 minutes</p>
          </div>

          <div className="space-y-3 text-sm text-gray-300">
            <div className="flex justify-between border-b border-gray-800/50 pb-2">
              <span className="text-gray-400 flex items-center gap-1.5"><Ticket className="w-4 h-4 text-rose-500" /> Selected Seats</span>
              <span className="font-semibold text-rose-500 font-mono">
                {selectedSeats.length > 0 ? selectedSeats.join(', ') : 'None selected'}
              </span>
            </div>
            <div className="flex justify-between border-b border-gray-800/50 pb-2">
              <span className="text-gray-400 flex items-center gap-1.5"><Lock className="w-4 h-4 text-amber-400" /> Lock Engine</span>
              <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded font-medium">
                Redis SETNX (10m TTL)
              </span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-base font-bold text-white">Total Amount</span>
              <span className="text-2xl font-extrabold text-white font-mono">${totalCost.toFixed(2)}</span>
            </div>
          </div>

          {bookingError && (
            <div className="p-3 text-xs bg-red-500/10 border border-red-500/25 text-red-400 rounded-xl flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{bookingError}</span>
            </div>
          )}

          <button
            disabled={selectedSeats.length === 0 || bookingLoading}
            onClick={handleBookingSubmit}
            className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-violet-600 hover:from-rose-600 hover:to-violet-700 text-white font-bold rounded-xl shadow-lg hover:shadow-rose-500/25 disabled:bg-gray-800/80 disabled:from-gray-800 disabled:to-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2 active:scale-95 transition-all duration-150"
          >
            {bookingLoading ? (
              <>
                <LoaderIcon /> Acquiring 10m Lock...
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4" /> Hold Seats & Proceed
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

function LoaderIcon() {
  return (
    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
