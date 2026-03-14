# TrueNorth PM

A multi-tenant property management SaaS platform for small-to-medium landlords and property managers.
Live Demo: https://property-manager-lac.vercel.app

## Features

- **Portfolio Dashboard** — occupancy rate, monthly revenue, NOI, portfolio health score, cash flow charts
- **Property Management** — single-unit and multi-unit properties, full CRUD
- **Tenant Management** — lease tracking, lease progress, expiry alerts
- **Maintenance Requests** — priority tracking, vendor assignment
- **Expense Tracking** — category breakdown, tax deduction tagging, recurring expenses
- **Payments** — Stripe-powered online rent collection, payment links, transaction history
- **Reports & ROI Calculator** — financial summaries, tax reports, investment analysis
- **Multi-tenant Auth** — JWT authentication, team roles (admin / manager / viewer)
- **Subscription Tiers** — Starter / Professional / Enterprise via Stripe Billing

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| State | React Query (TanStack Query v5) |
| Backend | Node.js, Express |
| Database | SQLite (better-sqlite3) |
| Payments | Stripe |
| Deployment | Vercel (frontend) + Railway (backend) |

## Project Structure

```
├── backend/          # Express API server
│   ├── server.js     # Main server entry point
│   ├── database/     # SQLite schema & migrations
│   ├── middleware/   # JWT auth, subscription checks
│   ├── routes/       # Auth & subscription routes
│   └── scripts/      # DB init & CSV import utilities
├── dashboard/        # React frontend
│   └── src/
│       ├── components/   # Shared UI components
│       ├── hooks/        # React Query hooks (usePropertyQueries)
│       ├── pages/        # Route-level page components
│       ├── lib/          # API client
│       └── types/        # Shared TypeScript types
└── docs/             # Planning docs, API reference, guides
```

## Local Development

### 1. Clone & install

```bash
git clone <your-repo-url>

# Backend
cd backend
npm install
cp .env.example .env   # fill in your values

# Frontend
cd ../dashboard
npm install
cp .env.example .env   # fill in your values
```

### 2. Initialize the database

```bash
cd backend
node scripts/initDatabase.js
```

### 3. Start both servers

```bash
# Terminal 1 — backend (port 3001)
cd backend && npm run dev

# Terminal 2 — frontend (port 5173)
cd dashboard && npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## Deployment

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for full Railway + Vercel instructions.

**Quick summary:**
- Backend → [Railway](https://railway.app) (set root directory to `backend/`)
- Frontend → [Vercel](https://vercel.com) (set root directory to `dashboard/`, add `VITE_API_URL` env var)

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `JWT_SECRET` | ✅ | Long random string — run `openssl rand -base64 64` |
| `FRONTEND_URL` | ✅ | Your Vercel URL (for Stripe redirects) |
| `CORS_ORIGIN` | ✅ | Your Vercel URL (for CORS) |
| `STRIPE_SECRET_KEY` | ✅ | From Stripe Dashboard |
| `STRIPE_WEBHOOK_SECRET` | ⚠️ | For rent payment webhooks |
| `STRIPE_SUBSCRIPTION_WEBHOOK_SECRET` | ⚠️ | For subscription webhooks |
| `PORT` | optional | Defaults to `3001` |
| `DATABASE_PATH` | optional | Defaults to `./data/property_manager.db` |

### Frontend (`dashboard/.env`)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | ✅ | Your Railway backend URL + `/api` |

## License

MIT
