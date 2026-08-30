import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { Ticket, Calendar, Clock, MapPin, CheckCircle2, AlertCircle, Loader, XCircle, CreditCard } from 'lucide-react'
import { fetchUserBookings, releaseBooking } from '../services/api'
import type { BookingHistoryItem } from '../services/api'

export default function Bookings() {
  const { getToken } = useAuth()
  const [bookingsList, setBookingsList] = useState<BookingHistoryItem[]>([])
  const [loading, setLoading] = useState(true)

  const handleReleaseBooking = async (bookingId: string) => {
    try {
      const token = await getToken()
      await releaseBooking(bookingId, undefined, undefined, token)
      setBookingsList(prev => prev.filter(b => b.id !== bookingId))
    } catch (e) {
      console.warn('Failed to release booking:', e)
    }
  }

  useEffect(() => {
    const loadBookings = async () => {
      try {
        const token = await getToken()
        const data = await fetchUserBookings(token)
        setBookingsList(data)
        setLoading(false)
      } catch (err: any) {
        console.error('Failed to load bookings from API:', err)
        setLoading(false)
      }
    }
    loadBookings()
  }, [])

  const formatShowDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatShowTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-rose-500 gap-2">
        <Loader className="w-8 h-8 animate-spin" />
        <p className="font-semibold">Loading your bookings history...</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">My Bookings</h1>
        <p className="text-gray-400 text-sm mt-1">Review your tickets history and reservation details</p>
      </div>

      <div className="space-y-6">
        {bookingsList.length === 0 ? (
          <div className="bg-[#15161e] border border-gray-800/40 p-12 text-center rounded-xl text-gray-500 text-sm">
            No bookings found. Head back to the homepage to book a show!
          </div>
        ) : (
          null
        )}
        {bookingsList.map((booking) => {
          const isConfirmed = booking.status === 'CONFIRMED'
          const isPast = new Date(booking.showTime).getTime() < Date.now()

          return (
            <div
              key={booking.id}
              className="bg-[#15161e] border border-gray-800 rounded-2xl overflow-hidden shadow-xl flex flex-col md:flex-row relative"
            >
              {/* Ticket Status Bar Indicator */}
              <div
                className={`w-full md:w-3 shrink-0 h-3 md:h-auto ${
                  isConfirmed ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              ></div>

              {/* Details Body */}
              <div className="p-6 flex-1 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[10px] font-mono text-gray-500 font-bold uppercase tracking-wider">
                    Invoice Ref: {booking.id}
                  </span>
                  
                  {/* Status Badge */}
                  <div className="flex items-center gap-1.5">
                    {isConfirmed ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        Confirmed
                      </span>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/25 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                          Pending Hold
                        </span>
                        <Link
                          to={`/checkout?booking_id=${booking.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold bg-rose-500 hover:bg-rose-600 text-white rounded-full transition shadow"
                        >
                          <CreditCard className="w-3 h-3" /> Pay Now
                        </Link>
                        <button
                          onClick={() => handleReleaseBooking(booking.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 rounded-full transition cursor-pointer"
                        >
                          <XCircle className="w-3 h-3" /> Release Seats
                        </button>
                      </div>
                    )}
                    
                    {isPast && (
                      <span className="text-[10px] font-bold text-gray-500 bg-gray-900 border border-gray-800 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Past Show
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <h3 className="text-xl font-extrabold text-white tracking-tight hover:text-rose-500 transition-colors">
                    {booking.movieTitle}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-3 text-xs text-gray-400">
                    <span className="font-semibold text-rose-500">{booking.screenName}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-rose-500" /> {booking.theatreName}</span>
                  </div>
                </div>

                {/* Show Details Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-gray-850 text-xs sm:text-sm text-gray-300">
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Date</p>
                    <p className="font-medium flex items-center gap-1">
                      <Calendar className="w-4 h-4 text-rose-500" /> {formatShowDate(booking.showTime)}
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Time</p>
                    <p className="font-medium flex items-center gap-1">
                      <Clock className="w-4 h-4 text-rose-500" /> {formatShowTime(booking.showTime)}
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Booked Seats</p>
                    <p className="font-mono font-bold text-rose-500 flex items-center gap-1">
                      <Ticket className="w-4 h-4 text-rose-500" /> {booking.seats.join(', ')}
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Paid Amount</p>
                    <p className="font-extrabold text-white">${Number(booking.price).toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* Barcode representation */}
              <div className="w-full md:w-36 border-t md:border-t-0 md:border-l border-gray-800/80 p-6 flex flex-col items-center justify-center bg-[#181922] shrink-0">
                <div className="h-10 w-28 bg-white/10 rounded flex flex-col justify-between p-1.5 opacity-60">
                  {/* barcode stripes */}
                  <div className="h-full w-full bg-gradient-to-r from-gray-200 via-gray-900 to-gray-200" style={{ backgroundSize: '4px 100%' }}></div>
                </div>
                <span className="text-[9px] font-mono text-gray-500 mt-2 font-bold tracking-widest uppercase">
                  {booking.id.replace('bk-', '').toUpperCase()}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
