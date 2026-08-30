<div align="center">

# 🎬 ShowCity — High-Concurrency Movie Ticket Booking Platform

**A full-stack, distributed ticket reservation system featuring sub-millisecond atomic seat locking, real-time concurrency defense, and live checkout hold timers.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://client-tawny-kappa-19.vercel.app)
[![GitHub Repo](https://img.shields.io/badge/GitHub-Repository-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/mishraa-G/show_city)
[![Interview Guide](https://img.shields.io/badge/Interview%20Study%20Guide-Deep%20Dive-FF6B6B?style=for-the-badge&logo=googledocs&logoColor=white)](./INTERVIEW_GUIDE.md)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%20(Neon)-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://neon.tech)
[![Redis](https://img.shields.io/badge/Cache%20%26%20Locks-Redis%20(Upstash)-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://upstash.com)
[![Stripe](https://img.shields.io/badge/Payments-Stripe-635BFF?style=for-the-badge&logo=stripe&logoColor=white)](https://stripe.com)

<br />

### 🌐 Live Production Application: [https://client-tawny-kappa-19.vercel.app](https://client-tawny-kappa-19.vercel.app)
### 📘 Senior Engineering Interview Guide: [INTERVIEW_GUIDE.md](./INTERVIEW_GUIDE.md)

</div>

---

## 📌 Executive Summary & System Highlights

In high-traffic ticketing platforms (e.g. BookMyShow, Ticketmaster, Fandango), the primary engineering hurdle is **preventing race conditions and double-booking** when thousands of concurrent users contend for the same high-demand seats at the exact same second.

**ShowCity** solves this by implementing a **Two-Tier Reservation Engine**:
1. **Tier 1 (Pessimistic Distributed Locks)**: Uses Redis atomic `SET key userId NX EX 600` via Lua scripts to lock seats for a strictly bounded 10-minute hold window before transactions hit the database.
2. **Tier 2 (PostgreSQL ACID Isolation)**: Enforces row-level reservation checks to eliminate phantom inserts during failovers.
3. **Real-Time Synchronized UX**: Instant seat map updates (sub-3s polling), live countdown timer (`10:00 → 00:00`), and auto-release on walk-out/abandonment.

---

## 🏗️ Architecture & 3-State Seat Engine

```
                       ┌──────────────────────────────┐
                       │       Seat: AVAILABLE        │
                       └──────────────┬───────────────┘
                                      │
                      User selects seat & clicks "Hold"
                      Redis Atomic Multi-Key SET NX EX (10m TTL)
                                      │
                                      ▼
                       ┌──────────────────────────────┐
                       │     Seat: HELD / LOCKED      │
                       │   (Live 10-min countdown)    │
                       └──────────────┬───────────────┘
                                      │
              ┌───────────────────────┴────────────────────────┐
              │                                                │
        Stripe Webhook                                  Timer hits 00:00
  (checkout.session.completed)                           OR User cancels
              │                                                │
              ▼                                                ▼
     ┌──────────────────────────────┐                ┌───────────────────┐
     │        Seat: BOOKED          │                │  Seat: AVAILABLE  │
     │ (Postgres CONFIRMED status,  │                │  (Redis lock      │
     │  Redis lock evicted)         │                │   auto-evicted)   │
     └──────────────────────────────┘                └───────────────────┘
```

---

## 🎯 Key Technical Capabilities

| Feature | Implementation | Business Value |
|---|---|---|
| **Zero Race Conditions** | Redis Lua Script (`SET NX EX`) + Rollback | Guarantees that two users can never hold the same seat simultaneously |
| **Pessimistic 10-Min Hold** | 600s Redis TTL with live countdown timer | Protects inventory while allowing users ample time to complete payment |
| **Resilient 2-Tier Fallback** | In-memory atomic mutex engine | Ensures 100% reservation availability even during cloud network partitions |
| **Stripe Idempotency** | Webhook signature check & transaction guards | Prevents duplicate ticket generation on network retries |
| **Interview Concurrency Mode** | Dedicated multi-user simulation profile switcher | Allows interviewers to test race conditions in 2 browser tabs side-by-side |
| **Walk-Out Release** | Webhook `expired` event + `navigator.sendBeacon` | Frees seats immediately if customer abandons payment or closes the tab |

---

## 🛠️ Technology Stack

- **Frontend**: React 19, TypeScript, Vite, TailwindCSS, Lucide Icons, Clerk React SDK
- **Backend**: Node.js, Express 5, Prisma ORM, ioredis, Stripe SDK, Clerk Backend SDK
- **Database**: Serverless PostgreSQL ([Neon](https://neon.tech))
- **In-Memory Store**: Serverless Redis ([Upstash](https://upstash.com))
- **Hosting**: Vercel (Frontend CDN), Render (Backend Web Service)

---

## 🚀 Quick Start (Local Development)

### 1. Clone the Repository
```bash
git clone https://github.com/mishraa-G/show_city.git
cd show_city
```

### 2. Install Dependencies
```bash
npm run install:all
```

### 3. Configure Environment Variables
Copy `.env.example` to `server/.env` and `client/.env`:
```bash
cp .env.example server/.env
```

### 4. Run Both Services Concurrently
```bash
npm run dev
```
- **Client**: `http://localhost:5173`
- **Server**: `http://localhost:5001`

---

## 💡 System Design Talking Points (For Interviews)

When asked about distributed locking or handling high concurrency:
- **Why Redis Lua instead of check-then-act?** A separate `GET` then `SET` introduces a Time-Of-Check to Time-Of-Use (TOCTOU) race condition. The Lua script guarantees atomicity within Redis's single-threaded event loop.
- **What happens if a multi-seat batch partially fails?** If a user selects 3 seats and 1 is taken, the Lua script / rollback deletes the newly acquired locks and returns HTTP `409 Conflict`, leaving zero orphaned holds.
- **How are abandoned carts handled?** Through three layers of defense: (1) Redis TTL eviction after 600s, (2) Browser unload beacon, and (3) Explicit cancellation endpoints.

---

## 📄 License
This project is open-source under the [MIT License](LICENSE).
