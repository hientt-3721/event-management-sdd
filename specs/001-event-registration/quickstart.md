# Quickstart: Event Registration Application

**Branch**: `001-event-registration`
**Date**: 2026-05-05

---

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | 20 LTS | https://nodejs.org |
| pnpm | 9+ | `npm i -g pnpm` |
| Supabase CLI | latest | `npm i -g supabase` |
| Git | any | https://git-scm.com |

---

## 1. Clone & Install

```bash
git clone <repo-url>
cd event-management
pnpm install
```

---

## 2. Supabase Local Setup

```bash
# Start local Supabase (Docker required)
supabase start

# Run database migrations
supabase db push

# Note the local credentials printed by `supabase start`:
# API URL:     http://127.0.0.1:54321
# anon key:    eyJ...
# service_role key: eyJ...
```

---

## 3. Environment Variables

Copy the example file and fill in the values:

```bash
cp .env.example .env.local
```

`.env.local` values (all required):

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321      # local dev
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from supabase start>
SUPABASE_SERVICE_ROLE_KEY=<service_role key>         # server-side only

# Resend (email)
RESEND_API_KEY=re_...                                 # https://resend.com/api-keys

# Cron security
CRON_SECRET=<random 32-char string>                  # generate with: openssl rand -hex 32

# App
NEXT_PUBLIC_APP_URL=http://localhost:3004
```

> **Never commit `.env.local` to the repository.**

---

## 4. Configure Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials.
2. Create an OAuth 2.0 Client ID (Web application).
3. Add authorised redirect URI: `http://127.0.0.1:54321/auth/v1/callback` (local Supabase).
4. In Supabase Dashboard (or `supabase/config.toml`): enable Google provider, paste Client ID and Secret.

For production, add the Vercel deployment URL as an additional redirect URI.

---

## 5. Run the Development Server

```bash
pnpm dev
```

Application available at: `http://localhost:3004`

| Route | Description |
|---|---|
| `/` | Landing page |
| `/events` | Public event list |
| `/login` | Google sign-in |
| `/tickets` | My Tickets (authenticated) |
| `/organizer/dashboard` | Organizer panel (organizer role required) |
| `/en/docs` | Documentation in English |
| `/vi/docs` | Documentation in Vietnamese |

---

## 6. Running Tests

```bash
# Unit + integration tests (Vitest)
pnpm test

# Watch mode
pnpm test:watch

# E2E tests (Playwright — requires dev server running)
pnpm test:e2e

# All tests (CI mode)
pnpm test:ci
```

> **TDD reminder**: Write failing tests first, then implement. The `pnpm test:watch` command keeps the feedback loop tight.

---

## 7. Database Migrations

```bash
# Create a new migration
supabase migration new <migration_name>

# Apply all pending migrations
supabase db push

# Reset local database (drops all data)
supabase db reset

# Generate TypeScript types from schema
supabase gen types typescript --local > src/types/database.ts
```

Always regenerate types after changing the schema.

---

## 8. Deploying to Vercel

### First deployment

```bash
# Install Vercel CLI
pnpm i -g vercel

# Deploy (follow prompts)
vercel

# Link to Supabase production project
# Set all env vars in Vercel Dashboard → Project → Settings → Environment Variables
```

### Required environment variables on Vercel

Same as `.env.local` but using production Supabase project credentials:
- `NEXT_PUBLIC_SUPABASE_URL` — production Supabase API URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `CRON_SECRET`
- `NEXT_PUBLIC_APP_URL` — your Vercel production URL

### Supabase production setup

1. Create a new project at https://supabase.com
2. Run migrations against production: `supabase db push --db-url <production-db-url>`
3. Enable Google OAuth provider in Supabase Dashboard
4. Add Vercel production URL to Google OAuth authorised redirect URIs

### Preview deployments

Vercel automatically creates a preview deployment for every pull request. Each preview uses the same Supabase project — no additional config needed.

---

## 9. Assigning Organizer Role

User roles are manually assigned. To promote a user to organizer:

```sql
-- Run in Supabase SQL Editor (production or local)
UPDATE profiles
SET role = 'organizer'
WHERE id = '<user-uuid>';
```

The user must have signed in at least once (so their profile row exists) before this can be run.

---

## 10. Project Scripts Reference

| Script | Description |
|---|---|
| `pnpm dev` | Start Next.js dev server |
| `pnpm build` | Production build |
| `pnpm start` | Start production server |
| `pnpm test` | Run Vitest (unit + integration) |
| `pnpm test:e2e` | Run Playwright E2E tests |
| `pnpm test:ci` | Run all tests in CI mode |
| `pnpm lint` | ESLint check |
| `pnpm typecheck` | TypeScript type check |
| `pnpm db:types` | Regenerate Supabase TS types |
