import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { ShieldCheck, Loader, ShoppingBag, Clock, AlertTriangle, ArrowLeft, XCircle } from 'lucide-react'
import { createPaymentSession, triggerPaymentWebhook, releaseBooking, API_BASE } from '../services/api'
import { useAuth } from '@clerk/clerk-react'

export default function Checkout() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const bookingId = searchParams.get('booking_id')
  const showId = searchParams.get('show_id') || undefined
  
  const { getToken } = useAuth()
  
  const [loading, setLoading] = useState(true)
  const [checkoutSession, setCheckoutSession] = useState<{ sessionId: string; url: string } | null>(null)
  const [error, setError] = useState('')
  const [paying, setPaying] = useState(false)
  const [paySuccess, setPaySuccess] = useState(false)

  // 10-Minute (600s) Distributed Lock Countdown Timer
  const [secondsLeft, setSecondsLeft] = useState(600)
  const [isExpired, setIsExpired] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Simulated Card Info
  const cardNumber = '4242 •••• •••• 4242'
  const expiry = '12/28'
  const cvv = '123'

  const isCanceled = searchParams.get('canceled') === 'true'

  useEffect(() => {
    if (isCanceled) {
      setError('Payment was cancelled. Your seats are currently still reserved until the timer expires.')
    }
  }, [isCanceled])

  // Countdown timer effect
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current)
          setIsExpired(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  // Auto-release seats on browser tab unload or navigation if not completed
  useEffect(() => {
    const handleUnload = () => {
      if (bookingId && !paySuccess) {
        // Attempt beacon release
        navigator.sendBeacon(
          `${API_BASE}/booking/release`,
          new Blob([JSON.stringify({ bookingId, showId })], { type: 'application/json' })
        )
      }
    }

    window.addEventListener('beforeunload', handleUnload)
    return () => {
      window.removeEventListener('beforeunload', handleUnload)
    }
  }, [bookingId, showId, paySuccess])

  // Initialize Payment Session
  useEffect(() => {
    const initSession = async () => {
      if (!bookingId) {
        setError('Missing booking reference in URL parameters.')
        setLoading(false)
        return
      }

      // If user came back from cancelling Stripe checkout, do NOT auto-redirect them back to Stripe!
      if (isCanceled) {
        setLoading(false)
        return
      }

      try {
        const token = await getToken()
        const data = await createPaymentSession(bookingId, token)
        
        // If a real Stripe session redirect URL is returned, redirect directly to Stripe checkout page
        if (data.url && (data.url.includes('stripe.com') || data.url.includes('checkout.stripe.com'))) {
          window.location.href = data.url
          return
        }

        setCheckoutSession({ sessionId: data.sessionId, url: data.url })
        setLoading(false)
      } catch (err: any) {
        setError(err.message || 'Failed to initiate checkout session.')
        setLoading(false)
      }
    }
    
    initSession()
  }, [bookingId, getToken, isCanceled])

  const handleCancelReservation = async () => {
    if (!bookingId) return
    try {
      const token = await getToken()
      await releaseBooking(bookingId, showId, undefined, token)
      navigate('/')
    } catch (err) {
      navigate('/')
    }
  }

  const handleSimulatedPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!bookingId || isExpired) return

    setPaying(true)
    setError('')

    const sessionId = checkoutSession?.sessionId || `mock-session-${Math.random().toString(36).substring(2, 10)}`

    try {
      // Trigger webhook to confirm booking status
      await triggerPaymentWebhook(bookingId, sessionId)
      
      setPaying(false)
      setPaySuccess(true)
      
      setTimeout(() => {
        navigate('/bookings')
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'Payment confirmation failed.')
      setPaying(false)
    }
  }

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  const timerPercentage = Math.max(0, (secondsLeft / 600) * 100)

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-rose-500 gap-3">
        <Loader className="w-8 h-8 animate-spin" />
        <p className="font-semibold text-gray-300">Initializing secure payment session...</p>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-10 space-y-6">
      {/* Top action navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleCancelReservation}
          className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-rose-500 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Cancel & Release Seats
        </button>

        {/* Live Redis Lock Countdown Timer Badge */}
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-bold border ${
          isExpired
            ? 'bg-red-500/10 border-red-500/30 text-red-400'
            : secondsLeft < 120
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 animate-pulse'
            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
        }`}>
          <Clock className="w-3.5 h-3.5" />
          <span>Hold Time: {formatTimer(secondsLeft)}</span>
        </div>
      </div>

      {/* Timer Visual Progress Bar */}
      <div className="w-full bg-gray-900 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-full transition-all duration-1000 ${
            secondsLeft < 120 ? 'bg-amber-500' : 'bg-gradient-to-r from-emerald-500 to-teal-400'
          }`}
          style={{ width: `${timerPercentage}%` }}
        ></div>
      </div>

      {paySuccess ? (
        // Payment Success state
        <div className="bg-[#15161e] border border-gray-800 rounded-2xl p-8 text-center space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
          <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto animate-bounce">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-extrabold text-white">Payment Confirmed!</h2>
            <p className="text-sm text-gray-400">
              Stripe webhook captured. Booking <span className="font-mono text-rose-500">{bookingId}</span> is confirmed and seats are permanently booked in PostgreSQL.
            </p>
          </div>
          <div className="text-xs text-gray-500 flex items-center justify-center gap-1.5 pt-4">
            Redirecting to My Bookings <Loader className="w-3.5 h-3.5 animate-spin" />
          </div>
        </div>
      ) : isExpired ? (
        // Reservation Expired State
        <div className="bg-[#15161e] border border-red-500/30 rounded-2xl p-8 text-center space-y-6 shadow-2xl">
          <div className="w-14 h-14 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">Reservation Expired</h2>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              Your 10-minute hold on these seats has elapsed. The Redis distributed lock was evicted to allow other customers to reserve them.
            </p>
          </div>
          <Link
            to="/"
            className="inline-block px-6 py-2.5 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-rose-500/20"
          >
            Select New Seats
          </Link>
        </div>
      ) : isCanceled ? (
        // Payment Cancelled / Walked out State
        <div className="bg-[#15161e] border border-amber-500/30 rounded-2xl p-8 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-extrabold text-white">Payment Walked Out / Cancelled</h2>
            <p className="text-xs text-gray-400 max-w-md mx-auto">
              You cancelled your payment checkout session. Your seats are currently still held for another{' '}
              <span className="font-mono text-amber-400 font-bold">{formatTimer(secondsLeft)}</span>.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={handleCancelReservation}
              className="w-full sm:w-auto px-6 py-3 bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-2"
            >
              <XCircle className="w-4 h-4" /> Release Held Seats & Exit
            </button>
            <button
              onClick={async () => {
                setLoading(true)
                try {
                  const token = await getToken()
                  const data = await createPaymentSession(bookingId!, token)
                  if (data.url) window.location.href = data.url
                } catch (e: any) {
                  setError(e.message)
                  setLoading(false)
                }
              }}
              className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-rose-500 to-violet-600 hover:from-rose-600 hover:to-violet-700 text-white font-bold text-xs rounded-xl shadow-lg transition cursor-pointer flex items-center justify-center gap-2"
            >
              <ShoppingBag className="w-4 h-4" /> Retry Stripe Checkout
            </button>
          </div>
        </div>
      ) : (
        // Checkout Card state
        <div className="bg-[#15161e] border border-gray-800 rounded-2xl overflow-hidden shadow-2xl relative">
          <div className="p-6 bg-[#1a1c27] border-b border-gray-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-rose-500" />
              <span className="font-bold text-white text-base">Payment Checkout</span>
            </div>
            <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-0.5 rounded-full">
              Seats Locked (10m)
            </span>
          </div>

          <form onSubmit={handleSimulatedPayment} className="p-6 space-y-6">
            {error && (
              <div className="p-3 text-xs bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl flex items-center gap-2">
                <XCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Booking Reference Information */}
            <div className="bg-[#0e1017] p-4 rounded-xl border border-gray-800/50 space-y-2 text-sm text-gray-300">
              <div className="flex justify-between">
                <span className="text-gray-500 text-xs">Booking ID</span>
                <span className="font-mono text-xs text-white">{bookingId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 text-xs">Lock TTL</span>
                <span className="text-xs text-emerald-400 font-mono font-semibold">{secondsLeft}s remaining</span>
              </div>
            </div>

            {/* Credit Card simulated input */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-400">Card Number (Stripe Test)</label>
                <input
                  type="text"
                  disabled
                  value={cardNumber}
                  className="w-full bg-[#0e1017] border border-gray-800 rounded-xl px-4 py-3 text-sm text-white font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-400">Expires</label>
                  <input
                    type="text"
                    disabled
                    value={expiry}
                    className="w-full bg-[#0e1017] border border-gray-800 rounded-xl px-4 py-3 text-sm text-white font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-400">CVV</label>
                  <input
                    type="text"
                    disabled
                    value={cvv}
                    className="w-full bg-[#0e1017] border border-gray-800 rounded-xl px-4 py-3 text-sm text-white font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 space-y-3">
              <button
                type="submit"
                disabled={paying || isExpired}
                className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-violet-600 hover:from-rose-600 hover:to-violet-700 text-white font-bold rounded-xl shadow-lg hover:shadow-rose-500/25 disabled:bg-gray-800 disabled:from-gray-800 disabled:to-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-95 transition-all duration-150"
              >
                {paying ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" /> Verifying Payment...
                  </>
                ) : (
                  <>Pay & Confirm Booking</>
                )}
              </button>

              <button
                type="button"
                onClick={handleCancelReservation}
                className="w-full py-2.5 text-xs text-gray-400 hover:text-red-400 transition-colors"
              >
                Release Seats & Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
