# Deployment Guide

## Overview

| Service | Purpose | Cost |
|---|---|---|
| [Railway](https://railway.app) | Backend (Node.js + SQLite) | Free tier available |
| [Vercel](https://vercel.com) | Frontend (React/Vite) | Free tier available |

---

## Step 1 — Push to GitHub

```bash
cd "Property Manager"
git add .
git commit -m "Initial deployment setup"
git push
```

---

## Step 2 — Deploy Backend to Railway

1. Go to [railway.app](https://railway.app) → sign up with GitHub
2. **New Project → Deploy from GitHub repo** → select your repo
3. Set **Root Directory** to `backend`
4. Go to **Variables** tab and add:

| Variable | Value |
|---|---|
| `JWT_SECRET` | Run `openssl rand -base64 64` in terminal, paste result |
| `FRONTEND_URL` | Leave blank for now (fill after Vercel deploy) |
| `CORS_ORIGIN` | Leave blank for now (fill after Vercel deploy) |
| `STRIPE_SECRET_KEY` | From [Stripe Dashboard → API keys](https://dashboard.stripe.com/apikeys) |
| `STRIPE_WEBHOOK_SECRET` | From Stripe → Developers → Webhooks |
| `STRIPE_SUBSCRIPTION_WEBHOOK_SECRET` | From Stripe → Developers → Webhooks |

5. Go to **Volumes** → Add a volume mounted at `/app/data`
   > This keeps your SQLite database alive between deploys. Without it, data resets on every deploy.

6. Click **Deploy**
7. Railway gives you a URL like: `https://your-app.up.railway.app`
8. Test it: `https://your-app.up.railway.app/health` → should return `{"status":"ok"}`

---

## Step 3 — Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com) → sign up with GitHub
2. **Add New Project** → import your repo
3. Set **Root Directory** to `dashboard`
4. Under **Environment Variables** add:

| Variable | Value |
|---|---|
| `VITE_API_URL` | `https://your-app.up.railway.app/api` (your Railway URL + `/api`) |

5. Click **Deploy**
6. Vercel gives you a URL like: `https://propmanager.vercel.app`

---

## Step 4 — Update Railway with your Vercel URL

Go back to Railway → Variables and set:
- `FRONTEND_URL` = `https://propmanager.vercel.app`
- `CORS_ORIGIN` = `https://propmanager.vercel.app`

Railway will automatically redeploy.

---

## Step 5 — Set up Stripe Webhooks (for payments)

1. Go to [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks)
2. Add endpoint: `https://your-app.up.railway.app/api/payments/webhook`
   - Events: `checkout.session.completed`, `payment_intent.succeeded`, `payment_intent.payment_failed`
3. Add endpoint: `https://your-app.up.railway.app/api/subscription/webhook`
   - Events: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`
4. Copy the **Signing secret** for each and add to Railway environment variables

---

## Custom Domain (optional)

- **Vercel**: Project Settings → Domains → Add your domain
- **Railway**: Service Settings → Networking → Custom Domain
- Update `FRONTEND_URL` and `CORS_ORIGIN` in Railway once your domain is live

---

## Upgrading from SQLite to PostgreSQL (future)

Railway also provides managed PostgreSQL. When you're ready to scale:
1. Add a PostgreSQL plugin to your Railway project
2. Replace `better-sqlite3` with `pg` in the backend
3. Update `database/schema.js` to use PostgreSQL syntax
4. Railway automatically provides a `DATABASE_URL` environment variable
