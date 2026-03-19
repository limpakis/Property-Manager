# Build Full-Stack Apps From Scratch (General Guide + Your Project)

## Who this is for

You already have a **basic programming mindset** (variables, functions, loops, conditions), and now you want to understand the full system:

- frontend
- backend
- database
- API
- architecture and contracts
- why these choices are used in real apps

This guide is in 2 parts:

1. **General concepts** (works for almost any web app)
2. **Applied to your Property Manager project**

---

# Part A — General Concepts (Reusable for any project)

## 1) The big picture: what a web app is

A web app is usually 3 main layers:

1. **Frontend** (runs in browser): UI and user interaction
2. **Backend** (runs on server): business logic and security
3. **Database** (persistent storage): saves and queries data

And one connector:

4. **API** (communication contract): rules for frontend/backend communication

Think of it as:

- Frontend = restaurant waiter (takes user requests)
- Backend = kitchen + manager (processes requests, enforces rules)
- Database = pantry + records (stores everything)
- API = menu/order format (strict contract)

---

## 2) Frontend (what it is, what it does)

### What is frontend?

Frontend is code that runs in the browser and renders what users see.

### Main responsibilities

- Render pages/components
- Handle clicks/forms
- Validate simple input for user experience
- Call backend APIs
- Show loading/success/error states

### What frontend should NOT do

- Store secret keys
- Make final security decisions
- Trust itself as source of truth

Reason: browser code is visible and editable by anyone.

---

## 3) Backend (what it is, what it does)

### What is backend?

Backend is server code that handles protected operations.

### Main responsibilities

- Authentication/authorization
- Input validation
- Business rules
- Data access (read/write DB)
- Integrations (payments, email, storage)
- Returning API responses

### Why backend exists

Without backend, you can’t safely manage user data, payments, roles, or rules.

---

## 4) Database (what it is, and why relational DBs matter)

### What is a database?

A database stores data durably so it survives app restarts.

### Relational database basics

- Data in tables (rows/columns)
- Relationships through IDs (foreign keys)
- Query language: SQL

### Why relational DB is common in SaaS

Business apps usually have structured relations:

- user belongs to account
- account has many properties
- property has many payments

Relational DBs are excellent at this.

---

## 5) API (the contract between frontend and backend)

### What is an API?

API is a set of endpoints and rules: how to request data and what response shape to expect.

Example endpoint:

- `GET /api/properties`

### API contract has 4 key parts

1. **URL + method** (`GET /api/properties`)
2. **Request shape** (headers/body/query params)
3. **Response shape** (JSON fields)
4. **Status codes** (`200`, `400`, `401`, `404`, `500`)

If frontend and backend agree on these, they integrate smoothly.

---

## 6) "Contract" in software (very important)

When people say contract, they usually mean one of these:

### 1) API contract

- request/response schema and endpoint behavior

### 2) Data contract

- database schema and allowed values

### 3) Type contract

- TypeScript interfaces/types between modules

### 4) Business contract

- explicit rules like:
  - only admins can invite users
  - trial users have limits
  - canceled subscriptions cannot access premium endpoints

Strong systems have clear contracts at all 4 levels.

---

## 7) What actually happens at runtime (step-by-step)

Most beginners hear "frontend calls backend" but don’t see all hidden steps. Here is the full flow.

### A) When you open a web app URL

1. You type URL and press Enter.
2. Browser resolves domain (DNS) to server IP.
3. Browser opens HTTPS connection (TLS handshake).
4. Browser requests app files (HTML, JS, CSS).
5. Browser executes JS bundle.
6. React mounts app in the DOM.
7. Router reads current path and picks page.

### B) When a page needs data

1. Component/hook triggers API call (`fetch`/query hook).
2. Request includes headers (often auth token).
3. Backend route receives request.
4. Middleware runs (auth, validation, limits).
5. Handler queries/updates database.
6. Backend returns JSON + status code.
7. Frontend receives response.
8. UI state/cache updates and React re-renders.

### C) Why this pattern is used

- **Separation of concerns**: UI in frontend, rules/security in backend.
- **Reliability**: database is source of truth.
- **Scalability**: same backend can serve web/mobile/partners.

### D) Why not alternatives?

- Why not "frontend directly to DB"?
  - insecure (DB credentials exposed), no central business control.
- Why not "all logic in frontend"?
  - user can tamper with browser code.
- Why not "backend returns HTML only" for this project?
  - SPA dashboards need rich client interactivity and fast in-app transitions.

---

## 8) Authentication vs Authorization

### Authentication = "Who are you?"

- login with email/password
- receive token/session

### Authorization = "What are you allowed to do?"

- role checks (admin/manager/viewer)
- plan checks (free/trial/pro)

Both are required.

---

## 9) Validation (frontend vs backend)

Do validation in both places, for different reasons:

- Frontend validation: better UX (fast feedback)
- Backend validation: security and data integrity (mandatory)

Never rely only on frontend validation.

---

## 10) Architecture structure you can reuse

A clean structure for most projects:

```text
project/
  backend/
    routes/
    middleware/
    services/
    database/
  frontend/
    pages/
    components/
    contexts/
    hooks/
    lib/
```

Why this structure?

- easy navigation
- separation of concerns
- easier teamwork and scaling

---

## 11) Why these technologies are popular (general)

### React (frontend)

- component model
- huge ecosystem
- good for complex dashboards

### Express (backend)

- simple and flexible
- many packages
- easy to learn and ship with

### SQLite/PostgreSQL (database)

- SQLite: fast setup, great for MVP
- PostgreSQL: stronger concurrency and scale

### Stripe (payments)

- handles hard payment/billing infrastructure
- reduces compliance burden

### "Why this instead of something else?" quick logic

- Choose React SPA when UI is interactive and app-like.
- Choose server-rendered-first frameworks when SEO/content pages are priority.
- Choose Express when you want minimal, flexible backend.
- Choose more opinionated backend frameworks when team needs stricter architecture out of the box.
- Choose SQLite for MVP speed and low ops.
- Choose PostgreSQL when you need stronger concurrency, scaling, and advanced DB features.

---

## 12) Webhooks (general concept)

A webhook is server-to-server event notification.

Why needed?

- payment might finish after user closes browser
- redirect pages are not reliable truth
- backend must receive official event from provider

So payment systems should trust webhook events, not only frontend redirects.

---

## 13) Deployment and environments

You usually have:

- local (development)
- staging (pre-production)
- production

Use environment variables for secrets and URLs.

Examples:

- `JWT_SECRET`
- `DATABASE_URL` or file path
- `STRIPE_SECRET_KEY`
- `FRONTEND_URL`

Never hardcode production secrets in source code.

---

## 14) Core mistakes beginners make

1. No clear API contract
2. No backend validation
3. Missing auth checks in protected endpoints
4. No data isolation in multi-tenant systems
5. Treating payment success redirect as final truth
6. Mixing all logic in one giant file too early

---

# Part B — Applying Those Concepts to Your Property Manager Project

## 15) Your project stack (mapped)

- Frontend: React + TypeScript + Vite + React Router + React Query + Tailwind/shadcn
- Backend: Node.js + Express
- Database: SQLite via `better-sqlite3`
- Auth: JWT + role-based checks
- Billing/payments: Stripe
- Deploy: Vercel (frontend) + Railway (backend)

---

## 16) How your web app actually runs (your project timeline)

This is the concrete runtime flow for your app.

### Step 1: Frontend boot

- Browser loads Vercel-hosted frontend bundle.
- `main.tsx` mounts React.
- `App.tsx` wraps app with Router, AuthProvider, React Query provider.

Why this setup?

- Providers give global capabilities (routing/auth/cache) once at top-level.
- Alternative (managing auth/cache manually in many components) becomes messy fast.

### Step 2: Auth check on startup

- `AuthContext` reads `auth_token` from localStorage.
- If token exists, frontend calls `/api/auth/me`.
- Backend validates token and returns user/account profile.
- Route guards decide public vs protected page access.

Why this pattern?

- Restores login on page refresh.
- Alternative (memory-only token) logs user out every refresh.

### Step 3: Data loading in pages

- A page hook (example: properties) calls API helper.
- API helper attaches bearer token.
- Backend receives request and runs middleware chain.
- DB query includes `account_id` filter.
- JSON returns; React Query caches and renders data.

Why React Query here instead of plain `useEffect + fetch` everywhere?

- Built-in caching, stale times, refetch control, and mutation invalidation.
- Reduces duplicated loading/error/cache logic across pages.

### Step 4: User action (example: create property)

- User submits form in frontend.
- Frontend sends `POST /api/properties`.
- Backend validates schema and subscription/property limits.
- Backend inserts row in DB.
- Frontend invalidates relevant queries and refreshes list/stats.

Why invalidate and refetch?

- Keeps frontend consistent with true backend state.
- Alternative (manual local updates only) can drift from server truth.

### Step 5: Payment/subscription events

- Backend creates Stripe checkout/payment link.
- User pays on Stripe-hosted page.
- Stripe sends webhook to backend.
- Backend updates `payments` / `accounts` status.

Why webhook-centric design?

- Webhook is provider-confirmed truth.
- Alternative (trusting frontend success page) is unreliable and can be faked.

---

## 17) Your backend protection model

In backend, protected routes go through middleware chain:

1. `authenticate` (valid JWT + load user/account)
2. `requireActiveSubscription` (plan/trial status)
3. endpoint-specific checks (validation/role/limits)

This gives consistent enforcement.

Why this chain order?

1. Verify identity first (`authenticate`).
2. Verify plan entitlement second (`requireActiveSubscription`).
3. Verify route-specific constraints third.

Alternative order can waste resources (validating large payloads before identity) or create logic bugs.

---

## 18) Your data isolation model (multi-tenant)

Core concept in your DB:

- each business is an `account`
- business data rows include `account_id`
- queries filter by `account_id`

Why this is essential:

- prevents one customer seeing another customer’s data
- foundation of secure multi-tenant SaaS

Why this model vs alternatives?

- Chosen: shared DB + `account_id` row isolation.
  - cheaper/simpler operations, fast for MVP.
- Alternative: separate database per customer.
  - stronger hard isolation, but much more ops complexity early.

---

## 19) Your contract examples (concrete)

### API contract example

- `POST /api/auth/login`
- Request: `{ email, password }`
- Response: `{ token, user, account }`

### Business contract example

- only admins can invite/remove team members

### Subscription contract example

- inactive/expired plans can be blocked with `402`

### Data contract example

- `subscription_tier` limited values (starter/professional/enterprise)

---

## 20) Your payments and subscriptions flow

### Tenant payment flow

1. backend creates Stripe checkout/payment link
2. user pays on Stripe page
3. Stripe webhook hits backend
4. backend updates `payments` row status/fees/net

### SaaS subscription flow

1. admin starts checkout for plan
2. Stripe completes subscription
3. webhook updates account tier/status/property limits

This is correct production architecture for payments.

Why Stripe-hosted checkout instead of custom card form?

- Much lower compliance/security burden.
- Faster to implement safely.
- Better reliability for subscription lifecycle tools.

Why not process cards directly yourself?

- You would handle far more security/compliance complexity (high risk and maintenance burden).

---

## 21) Why this stack was a good choice for this project

### Good for MVP and solo/founder speed

- JavaScript/TypeScript across frontend and backend
- fast setup and delivery
- manageable ops complexity

### Good for dashboard business domain

- React handles complex UI states well
- relational DB fits property/tenant/payment relations

### Good payment approach

- Stripe handles billing complexity safely

### Option-by-option tradeoff summary

- React SPA vs server-rendered pages:
  - React SPA wins for your dashboard interactivity.
- Express vs heavier backend framework:
  - Express wins for speed and flexibility in MVP.
- SQLite vs PostgreSQL:
  - SQLite wins for fast local/prototype simplicity.
  - PostgreSQL becomes better when concurrent traffic/complex reporting grows.
- JWT vs server sessions:
  - JWT fits decoupled API + frontend architecture.
  - Sessions can be simpler for immediate token revocation requirements.

---

## 22) What to improve next (same architecture, stronger quality)

1. Split large backend file into modules (routes/services)
2. Add automated tests for auth/payments/core CRUD
3. Add request logging + monitoring
4. Add rate limiting and stricter security middleware
5. Plan migration path SQLite -> PostgreSQL for scale

---

## 23) If someone asks you to explain your system in 45 seconds

"This is a multi-tenant SaaS with a React TypeScript frontend and an Express backend. The frontend uses a centralized API client and sends JWT bearer tokens. The backend validates tokens, enforces subscription and role rules, then queries a relational SQLite database where all business records are isolated by account_id. Stripe is used for both tenant payments and SaaS subscriptions, and webhook events are the source of truth for payment and billing status updates. Frontend and backend are deployed separately on Vercel and Railway."

---

## 24) Minimum learning roadmap (for your current level)

### Week 1: API and backend basics

- HTTP methods + status codes
- build 5 Express endpoints
- add JWT login

### Week 2: frontend integration

- React routing
- fetch API calls
- auth context and protected routes

### Week 3: database + business rules

- SQL tables/relations
- account_id data isolation
- validation and role checks

### Week 4: payments + deployment

- Stripe checkout and webhooks
- env vars and deployment setup
- end-to-end testing of core user flows

Repeat module rebuilds until you can do them from memory.

---

## 25) Final checklist: you understand this if you can answer

1. What is frontend vs backend responsibility?
2. Why do we need API contracts?
3. Why backend validation is mandatory?
4. How JWT authentication works?
5. How authorization differs from authentication?
6. How multi-tenant isolation works with `account_id`?
7. Why webhooks are needed for payments?
8. Why this stack was chosen for MVP speed?
9. What exactly happens from typing URL to first data render?
10. Why webhook is more trustworthy than frontend redirect for payments?

If you can explain all 10 clearly, you’re in strong shape.

---

## 26) Real code: where services communicate in THIS project

You asked for actual examples, not theory. This section traces real communication across files.

### Example A: "Open app and decide if user is logged in"

#### Step 1 — App shell is mounted

In frontend `App.tsx`, your providers are wired in this order:

1. `QueryClientProvider` (server-state cache)
2. `BrowserRouter` (routing)
3. `AuthProvider` (auth/session state)
4. `AppRoutes` (public/protected pages)

What this means in practice:

- Every page can use auth state and query hooks.
- `ProtectedRoute` can block page access before page renders.

#### Step 2 — AuthProvider checks token and calls backend

In `AuthContext.tsx`:

- token is read from `localStorage.getItem('auth_token')`
- `refreshProfile()` sends `GET /api/auth/me` with `Authorization: Bearer <token>`
- success -> set `user` and `account`
- failure -> `logout()` and clear token

So frontend file communication is:

`App.tsx` -> `AuthProvider` (`AuthContext.tsx`) -> backend endpoint `/api/auth/me`

#### Step 3 — Backend route validates identity

In backend `routes/auth.js`:

- `router.get('/me', authenticate, ...)`
- `authenticate` middleware (from `middleware/auth.js`) verifies JWT
- then `auth.js` route queries account and returns JSON

Backend file communication is:

`routes/auth.js` -> `middleware/auth.js` -> `database/schema.js` (`getDb`) -> SQLite

---

### Example B: "Load Properties page"

#### Frontend chain (real files)

1. Route `/properties` is defined in `App.tsx`.
2. Page uses hook `useProperties()` from `usePropertyQueries.ts`.
3. `useProperties()` executes `api.getProperties()`.
4. `api.getProperties()` calls `fetchAPI('/properties')` in `api.ts`.
5. `fetchAPI` attaches bearer token automatically.

So file-to-file in frontend is:

`App.tsx` -> `pages/Properties.tsx` -> `hooks/usePropertyQueries.ts` -> `lib/api.ts`

#### Backend chain (real files)

1. Request hits `protectedRouter.get('/properties', ...)` in `server.js`.
2. Before handler, router-level middleware already ran:
   - `authenticate`
   - `requireActiveSubscription`
3. Handler executes SQL:
   - `SELECT * FROM properties WHERE account_id = ?`
4. Backend maps DB fields to API shape and returns JSON.

This is service communication:

- Frontend service (`api.ts`) <-> Backend API service (`server.js`) <-> Data service (SQLite via `getDb()`)

---

### Example C: "Create Property" (write operation)

#### Client side

- mutation hook in `usePropertyQueries.ts` -> `api.createProperty(property)`
- sends `POST /api/properties`
- on success invalidates query keys:
  - `properties`
  - `dashboard-stats`

Why invalidate?

- forces refetch of fresh backend truth
- avoids stale UI after write

#### Server side

Route in `server.js`:

- `protectedRouter.post('/properties', checkPropertyLimit, validate(propertySchema), ...)`

Execution order:

1. `authenticate`
2. `requireActiveSubscription`
3. `checkPropertyLimit`
4. `validate(propertySchema)`
5. business logic insert

Then SQL writes:

- insert into `properties`
- increment `accounts.current_property_count`
- insert usage log into `usage_logs`

This is a great real example of layered contracts:

- auth contract
- plan contract
- validation contract
- data contract

---

### Example D: "Login" end-to-end

#### Frontend login call

In `AuthContext.tsx`:

```ts
const response = await fetch(`${API_BASE_URL}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});
```

On success:

- set `user`, `account`, `token`
- persist token to localStorage

#### Backend login route

In `routes/auth.js`:

- query user by email
- compare password with bcrypt hash
- load account
- generate JWT via `generateToken(user)` from `middleware/auth.js`
- return `{ token, user, account }`

So communication is explicit between files:

- `routes/auth.js` imports `generateToken` from `middleware/auth.js`
- both import DB access from `database/schema.js`

---

### Example E: "How backend itself is modularly communicating"

In backend entry (`server.js`) you have modular imports:

- `import { initializeDatabase, getDb } from './database/schema.js'`
- `import { authenticate, requireActiveSubscription, checkPropertyLimit } from './middleware/auth.js'`
- `import authRoutes from './routes/auth.js'`
- `import subscriptionRoutes from './routes/subscription.js'`

Then mounted routes:

- `app.use('/api/auth', authRoutes)`
- `app.use('/api/subscription', subscriptionRoutes)`
- `app.use('/api', protectedRouter)`

This is the core pattern of inter-file communication in Express:

1. import module
2. mount module
3. middleware chain controls behavior

---

## 27) What exactly is a "framework" (with your real example)

### Simple definition

A framework is a pre-built structure and lifecycle that your code plugs into.

It gives you:

- conventions
- abstractions
- lifecycle hooks
- routing/state/middleware patterns

Instead of writing everything from zero.

### In your project: framework examples

#### React (frontend framework/library ecosystem)

What React gives you:

- component model
- rendering lifecycle
- hooks (`useState`, `useEffect`, context)

What your code provides:

- page components
- route definitions
- auth logic inside context

So: React controls *how* rendering/lifecycle works; your app defines *what* to render.

#### Express (backend framework)

What Express gives you:

- HTTP server abstraction
- routing (`app.get`, `router.post`)
- middleware pipeline (`next()` chain)

What your code provides:

- business rules
- SQL queries
- auth/subscription logic

So: Express controls request lifecycle; your app defines domain behavior.

#### TanStack Query (data-fetching framework utility)

What it gives:

- query cache
- stale-time control
- mutation+invalidation primitives

What your app provides:

- query functions (`api.getProperties`)
- invalidation rules on mutation success

---

## 28) Where to look in code when debugging communication

Use this map when something "doesn’t work":

### If page is blank or route access is wrong

- check `App.tsx` (`ProtectedRoute`, route definitions)
- check `AuthContext.tsx` (`isLoading`, `isAuthenticated`, refresh logic)

### If request fails with 401/402

- check frontend `api.ts` header injection
- check backend `authenticate` and `requireActiveSubscription` in `middleware/auth.js`

### If data is wrong/missing

- check SQL query in `server.js` route
- confirm `account_id` filter exists
- confirm response mapping format expected by frontend

### If writes succeed but UI doesn’t update

- check mutation `onSuccess` invalidation in `usePropertyQueries.ts`
- verify query keys match the read hooks

---

## 29) One compact end-to-end "communication graph"

```text
User click
  -> React component/page
  -> hook (useQuery/useMutation)
  -> API client (fetchAPI)
  -> HTTP request /api/...
  -> Express route entry
  -> middleware (auth/subscription/validation)
  -> route handler business logic
  -> SQLite query/transaction
  -> JSON response
  -> React Query cache update/invalidation
  -> React re-render
  -> User sees updated UI
```

If you can narrate this graph while pointing to real files, you fully understand "how files and services communicate" in a production-style app.
