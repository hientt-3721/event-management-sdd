# Quickstart: Event Registration Application (v2)

**Branch**: `002-ux-improvements`
**Updated**: 2026-05-06

---

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | 20 LTS | https://nodejs.org |
| pnpm | 9+ | `npm i -g pnpm` |
| Git | any | https://git-scm.com |

---

## 1. Clone & Install

```bash
git clone https://github.com/hientt-3721/event-management-sdd.git
cd event-management
pnpm install
```

---

## 2. Environment Variables

Copy the example file and fill in the values from your Supabase project:

```bash
cp .env.example .env.local
```

Required values in `.env.local`:

```bash
# Supabase (get from https://supabase.com/dashboard/project/<id>/settings/api)
NEXT_PUBLIC_SUPABASE_URL=https://<project-id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service_role key>   # server-side only, never expose to client

# Resend (optional for local dev — email reminders)
RESEND_API_KEY=re_placeholder_local_dev

# Cron secret (any random string)
CRON_SECRET=$(openssl rand -hex 32)

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3005
```

> **Never commit `.env.local`** — it is listed in `.gitignore`.

---

## 3. Run the Development Server

```bash
pnpm next dev -p 3005
```

Application available at: **http://localhost:3005**

| Route | Description |
|---|---|
| `/` | Landing page |
| `/events` | Public event list |
| `/login` | Sign in (Google OAuth or email/password) |
| `/tickets` | My Tickets (requires login) |
| `/organizer` | Organizer dashboard (requires organizer role) |
| `/organizer/checkin` | Check-in scanner (requires organizer/staff role) |
| `/docs` | Documentation (bilingual VI/EN) |

---

## 4. Demo Accounts

Two pre-configured accounts let you explore all app roles without a Google account:

| Role | Email | Password |
|------|-------|----------|
| 🎫 Attendee | `demo@attendee.com` | `Demo1234!` |
| 🏢 Organizer | `demo@organizer.com` | `Demo1234!` |

To use: go to `/login` → click **"Sign in with Email"** → enter the credentials above.

---

## 5. Set Up Demo Accounts (one-time, Supabase Dashboard)

If the demo accounts are not yet created in your Supabase project:

1. Open [Supabase Dashboard → Authentication → Users](https://supabase.com/dashboard/project/oikzsbbkdbaenusarszq/auth/users)
2. Click **"Add user"** → fill in `demo@attendee.com` / `Demo1234!` → save
3. Repeat for `demo@organizer.com` / `Demo1234!`
4. Run the following SQL in the [SQL Editor](https://supabase.com/dashboard/project/oikzsbbkdbaenusarszq/editor):

```sql
-- Replace UUIDs with the actual user IDs from the Auth Users table
INSERT INTO profiles (id, role, display_name, email) VALUES
  ('<attendee-uuid>',  'attendee',  'Demo Attendee',  'demo@attendee.com'),
  ('<organizer-uuid>', 'organizer', 'Demo Organizer', 'demo@organizer.com')
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;
```

---

## 6. Grant Organizer Role to Any Existing User

```bash
node scripts/set-role.mjs demo@organizer.com organizer
```

---

## 7. Configure Google OAuth (optional)

To enable Google login alongside email/password:

1. [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → Create OAuth 2.0 Client ID
2. Add authorised redirect URI: `https://<project-id>.supabase.co/auth/v1/callback`
3. Supabase Dashboard → Authentication → Providers → Google → enable and paste Client ID + Secret
4. For local dev add: `http://localhost:3005/auth/callback` to the list of redirect URLs in Supabase

---

## 8. Running Tests

```bash
# Unit + integration (Vitest)
pnpm test

# Watch mode
pnpm test:watch

# E2E (Playwright — requires dev server on :3005)
pnpm test:e2e

# All tests (CI)
pnpm test:ci
```

---

## 9. Build for Production

```bash
pnpm next build
```

---

## 10. Deploy to Vercel

1. Push to GitHub (`git push -u origin 001-event-registration`)
2. [vercel.com/new](https://vercel.com/new) → Import repo → Framework: Next.js
3. Add all environment variables from `.env.local` in Vercel project settings
4. Set `NEXT_PUBLIC_APP_URL` to your Vercel deployment URL (e.g. `https://event-management-sdd.vercel.app`)
5. In [Supabase → Auth → URL Configuration](https://supabase.com/dashboard/project/oikzsbbkdbaenusarszq/auth/url-configuration):
   - Add `https://event-management-sdd.vercel.app/auth/callback` to Redirect URLs
   - Update Site URL to your production URL

Every push to `main` triggers automatic Vercel redeploy.

---

## 11. Language Switching

The app supports Vietnamese 🇻🇳 and English 🇬🇧 throughout. Use the language toggle in the top navigation bar. Your preference is saved in a cookie (`NEXT_LOCALE`) and persists across page navigation.

Default language: **Vietnamese**.
