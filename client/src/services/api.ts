export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001'

export interface Movie {
  id: string
  title: string
  description: string
  duration: number
  genre: string
  rating: string
  language: string
  releaseDate: string
  posterUrl: string
}

export interface Show {
  id: string
  movieId: string
  screenId: string
  startTime: string
  endTime: string
  price: number
  screen: {
    id: string
    name: string
    theatre: {
      id: string
      name: string
      city: string
      address: string
    }
  }
}

export interface MovieDetails extends Movie {
  shows: Show[]
}

export interface Booking {
  id: string
  userId: string
  showId: string
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED'
  totalPrice: number
  seats: { seatId: string }[]
  createdAt: string
}

export interface ActiveSeatLock {
  seatId: string
  ttl: number
  isHeldBySelf?: boolean
}

export interface ActiveHold {
  bookingId: string
  showId: string
  seats: string[]
  expiresAt: number
}

export const saveActiveHold = (hold: ActiveHold) => {
  sessionStorage.setItem('showcity_active_hold', JSON.stringify(hold))
}

export const getActiveHold = (): ActiveHold | null => {
  try {
    const raw = sessionStorage.getItem('showcity_active_hold')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (Date.now() > parsed.expiresAt) {
      sessionStorage.removeItem('showcity_active_hold')
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export const clearActiveHold = () => {
  sessionStorage.removeItem('showcity_active_hold')
}

// Demo concurrency helper: allows simulating 2 different users in 2 different browser tabs
export const getActiveDemoUser = (): string | null => {
  return sessionStorage.getItem('showcity_demo_user')
}

export const setActiveDemoUser = (user: string | null) => {
  if (user) {
    sessionStorage.setItem('showcity_demo_user', user)
  } else {
    sessionStorage.removeItem('showcity_demo_user')
  }
}

const buildAuthHeaders = (token?: string | null): Record<string, string> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const demoUser = getActiveDemoUser()

  if (demoUser) {
    headers['X-Demo-User'] = demoUser
    headers['Authorization'] = `Bearer demo_${demoUser}`
    return headers
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

export const fetchMovies = async (): Promise<Movie[]> => {
  const response = await fetch(`${API_BASE}/movies`)
  if (!response.ok) throw new Error('Failed to fetch movies')
  return response.json()
}

export const fetchMovieById = async (id: string): Promise<MovieDetails> => {
  const response = await fetch(`${API_BASE}/movie/${id}`)
  if (!response.ok) throw new Error('Failed to fetch movie details')
  return response.json()
}

export const createBooking = async (
  userId: string,
  showId: string,
  seats: string[],
  token?: string | null
): Promise<{ message: string; booking: Booking; expiresInSeconds: number; heldSeats: string[] }> => {
  const headers = buildAuthHeaders(token)

  const response = await fetch(`${API_BASE}/booking`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ userId, showId, seats })
  })

  if (!response.ok) {
    const err = await response.json()
    throw new Error(err.error || 'Failed to create booking')
  }
  const data = await response.json()

  // Track active hold locally in session
  saveActiveHold({
    bookingId: data.booking.id,
    showId,
    seats,
    expiresAt: Date.now() + (data.expiresInSeconds || 600) * 1000
  })

  return data
}

export const releaseBooking = async (
  bookingId?: string,
  showId?: string,
  seats?: string[],
  token?: string | null
): Promise<{ success: boolean; message: string }> => {
  const headers = buildAuthHeaders(token)

  try {
    const response = await fetch(`${API_BASE}/booking/release`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ bookingId, showId, seats })
    })

    clearActiveHold()

    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.error || 'Failed to release seats')
    }
    return response.json()
  } catch (err) {
    clearActiveHold()
    throw err
  }
}

export const createPaymentSession = async (
  bookingId: string,
  token?: string | null
): Promise<{ message: string; sessionId: string; url: string }> => {
  const headers = buildAuthHeaders(token)

  const response = await fetch(`${API_BASE}/payment`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ bookingId })
  })

  if (!response.ok) {
    const err = await response.json()
    throw new Error(err.error || 'Failed to initiate payment')
  }
  return response.json()
}

export const triggerPaymentWebhook = async (
  bookingId: string,
  sessionId: string
): Promise<{ status: string; message: string }> => {
  const response = await fetch(`${API_BASE}/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bookingId, sessionId })
  })
  if (!response.ok) {
    const err = await response.json()
    throw new Error(err.error || 'Webhook trigger failed')
  }
  return response.json()
}

export const fetchLockedSeats = async (
  showId: string,
  token?: string | null
): Promise<{ bookedSeats: string[]; lockedSeats: string[]; activeLocks: ActiveSeatLock[] }> => {
  const headers = buildAuthHeaders(token)
  const response = await fetch(`${API_BASE}/booking/locked-seats/${showId}`, { headers })
  if (!response.ok) throw new Error('Failed to fetch locked seats')
  return response.json()
}

export interface BookingHistoryItem {
  id: string
  movieTitle: string
  theatreName: string
  screenName: string
  seats: string[]
  showTime: string
  price: number
  status: 'CONFIRMED' | 'PENDING' | 'CANCELLED'
}

export const fetchUserBookings = async (
  token?: string | null
): Promise<BookingHistoryItem[]> => {
  const headers = buildAuthHeaders(token)

  const response = await fetch(`${API_BASE}/booking/user`, {
    headers
  })
  if (!response.ok) {
    const err = await response.json()
    throw new Error(err.error || 'Failed to fetch user bookings')
  }
  return response.json()
}
