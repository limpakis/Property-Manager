# TrueNorth PM — Frontend

React 18 + TypeScript + Vite frontend for the TrueNorth PM SaaS platform.

## Tech

- **Framework**: React 18 + TypeScript
- **Build**: Vite
- **Styling**: Tailwind CSS + shadcn/ui
- **State / Data fetching**: TanStack React Query v5
- **Routing**: React Router v6
- **Charts**: Recharts

## Getting Started

```bash
npm install
cp .env.example .env   # set VITE_API_URL
npm run dev            # http://localhost:5173
```

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend API base URL. Locally: `http://localhost:3001/api`. In production: your Railway URL + `/api` |

## Key Structure

```
src/
├── components/         # Shared UI components
│   └── ui/             # shadcn/ui primitives
├── contexts/           # AuthContext (JWT storage + user state)
├── hooks/
│   └── usePropertyQueries.ts   # All React Query hooks & mutations
├── lib/
│   └── api.ts          # Typed fetch wrapper (reads VITE_API_URL)
├── pages/              # One file per route
├── types/              # Shared TypeScript interfaces
└── App.tsx             # Router + auth guards
```

## Available Scripts

```bash
npm run dev       # Start dev server
npm run build     # Production build
npm run preview   # Preview production build locally
npm run lint      # ESLint
npm run test      # Vitest unit tests
```

## Deployment (Vercel)

1. Import repo on [vercel.com](https://vercel.com)
2. Set **Root Directory** to `dashboard`
3. Add environment variable: `VITE_API_URL=https://your-railway-url.up.railway.app/api`
4. Deploy

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
