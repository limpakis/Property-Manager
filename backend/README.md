# PropManager — Backend

Node.js + Express REST API for the PropManager SaaS platform.

## Tech

- **Runtime**: Node.js (ESM)
- **Framework**: Express
- **Database**: SQLite via `better-sqlite3`
- **Auth**: JWT (`jsonwebtoken` + `bcryptjs`)
- **Payments**: Stripe
- **Validation**: Joi
- **File Uploads**: Multer

## Getting Started

```bash
npm install
cp .env.example .env       # fill in required values (see below)
node scripts/initDatabase.js   # create the SQLite DB + tables
npm run dev                # starts on port 3001
```

### Health check

```
GET http://localhost:3001/health
→ { "status": "ok", "version": "3.0.0" }
```

## Environment Variables

Copy `.env.example` to `.env` and fill in:

| Variable | Required | Description |
|---|---|---|
| `JWT_SECRET` | ✅ | Long random string — `openssl rand -base64 64` |
| `FRONTEND_URL` | ✅ | Frontend URL for Stripe payment redirects |
| `CORS_ORIGIN` | ✅ | Frontend URL for CORS header |
| `STRIPE_SECRET_KEY` | ✅ | From [Stripe Dashboard](https://dashboard.stripe.com/apikeys) |
| `STRIPE_WEBHOOK_SECRET` | ⚠️ | Stripe webhook signing secret (payments) |
| `STRIPE_SUBSCRIPTION_WEBHOOK_SECRET` | ⚠️ | Stripe webhook signing secret (subscriptions) |
| `PORT` | optional | Defaults to `3001` |
| `DATABASE_PATH` | optional | Defaults to `./data/property_manager.db` |

## API Overview

All routes under `/api/*` require a `Bearer` token in the `Authorization` header.

| Resource | Endpoints |
|---|---|
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` |
| Properties | `GET/POST /api/properties`, `GET/PUT/DELETE /api/properties/:id` |
| Maintenance | `GET/POST /api/maintenance`, `PUT/DELETE /api/maintenance/:id` |
| Expenses | `GET/POST /api/expenses`, `PUT/DELETE /api/expenses/:id` |
| Payments | `GET /api/payments`, `POST /api/payments/create-checkout-session` |
| Rent Roll | `GET/POST /api/rent-roll`, `POST /api/rent-roll/generate` |
| Vendors | `GET/POST /api/vendors` |
| Documents | `GET /api/documents`, `POST /api/documents/upload` |
| Dashboard | `GET /api/dashboard/stats`, `GET /api/dashboard/chart-data` |
| Subscription | `GET /api/subscription`, `POST /api/subscription/create-checkout` |
| Team | `GET /api/auth/team`, `POST /api/auth/invite` |

Full API reference: [`../docs/API-DOCUMENTATION.md`](../docs/API-DOCUMENTATION.md)

## Subscription Tiers

| Tier | Property Limit | Price |
|---|---|---|
| Starter | 3 | Free trial / $19/mo |
| Professional | 20 | $49/mo |
| Enterprise | Unlimited | $99+/mo |

Limits are enforced server-side via the `checkPropertyLimit` middleware.

## Deployment (Railway)

1. Import repo on [railway.app](https://railway.app)
2. Set **Root Directory** to `backend`
3. Add all environment variables from the table above
4. Add a **Volume** mounted at `/app/data` to persist the SQLite database
5. Railway auto-detects `railway.json` and runs `node server.js`

## Scripts

```bash
node scripts/initDatabase.js   # Create tables from scratch
node scripts/migrateCSV.js     # Import legacy CSV data
node scripts/importCSV.js      # One-off CSV import utility
```
