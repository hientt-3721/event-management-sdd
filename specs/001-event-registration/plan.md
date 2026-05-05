# Implementation Plan: Event Registration — Iteration 2 (UI Polish & Feature Gaps)

**Branch**: `001-event-registration` | **Date**: 2026-05-05 | **Spec**: [spec.md](spec.md)
**Input**: Post-implementation audit — missing features, UX gaps, and visual polish requests

---

## Summary

Iteration 1 delivered core flows (Google OAuth, ticket registration, QR ticket, check-in scanner, notifications, bilingual docs). A live audit of the running application (localhost:3005) identified 6 categories of gaps:

1. **Public event browsing gated behind auth** — FR-012 requires events to be visible without login, but the attendee layout redirects unauthenticated visitors
2. **Organizer create/edit event flow not discoverable** — "Create Event" button exists at `/organizer` but edit event form is missing entirely
3. **Check-in scanner entry point not prominent** — link only appears on published event detail page; staff may not find it
4. **Login page not redirecting authenticated users** — visiting `/login` when already signed in shows the login form again
5. **Role-differentiated UI missing** — organizer and attendee see identical navigation and home page
6. **Visual polish** — sober default Tailwind look, no real logo, landing page lacks personality

**Technical approach**: All fixes are frontend/UI layer only. No DB schema changes required. Server Actions and RLS remain unchanged.

---

## Technical Context

**Language/Version**: TypeScript 5 / Node.js 20.20.2
**Primary Dependencies**: Next.js 14.2.29 (App Router), Supabase (cloud), Tailwind CSS 3.4, next-intl 3.26.3
**Storage**: PostgreSQL via Supabase — no changes this iteration
**Testing**: Vitest 3 + RTL 16 (unit/integration), Playwright 1.52 (E2E)
**Target Platform**: Web — desktop & mobile, Vercel deployment
**Project Type**: Web application (SaaS)
**Performance Goals**: <2s LCP on event list (currently unoptimised images)
**Constraints**: No DB migrations; no new npm packages unless strictly necessary; maintain all existing RLS policies
**Scale/Scope**: 6 gap items → ~15 file changes across app/ and components/

---

## Constitution Check

| Gate | Status | Notes |
|------|--------|-------|
| Server Components by default | ✅ PASS | New pages use Server Components; client opt-in only for interactive forms |
| No data fetching in useEffect | ✅ PASS | All data fetching via Server Components / Server Actions |
| RLS defined for every table | ✅ PASS | One addendum needed: insert ticket_types on published events (done) |
| TypeScript strict mode | ✅ PASS | No relaxation planned |
| Tests before implementation | ⚠️ NOTE | Iteration 2 fixes are UI/layout changes; unit tests for new actions will be added alongside |
| Supabase SSR client in Server Components | ✅ PASS | Maintained |

**No gate violations. Proceed.**

---

## Project Structure

```text
specs/001-event-registration/
├── plan.md        ← this file
├── research.md    ← Phase 0 (existing + updated gaps section)
├── data-model.md  ← unchanged (no schema changes)
├── quickstart.md  ← updated with new setup steps
└── contracts/     ← updated route list for public events

src/
├── app/
│   ├── page.tsx                          ← CHANGE: rich landing page with role-aware CTA
│   ├── (auth)/login/page.tsx             ← CHANGE: redirect if already authenticated
│   ├── events/                           ← NEW: public route (no auth guard)
│   │   ├── page.tsx                      ← moved from (attendee)/events/page.tsx
│   │   └── [id]/page.tsx                 ← moved from (attendee)/events/[id]/page.tsx
│   ├── (attendee)/                       ← CHANGE: remove events/* from this group
│   ├── organizer/
│   │   └── events/[id]/edit/page.tsx     ← NEW: edit event form
│   └── auth/callback/route.ts            ← EXISTS (fixed earlier)
├── components/
│   ├── layout/
│   │   ├── site-nav.tsx                  ← CHANGE: role-aware nav, logo component
│   │   ├── nav-link.tsx                  ← EXISTS (added earlier)
│   │   └── app-logo.tsx                  ← NEW: SVG logo component
│   ├── events/
│   │   └── register-button.tsx           ← CHANGE: show login prompt if unauthenticated
│   └── organizer/
│       └── edit-event-form.tsx           ← NEW: edit event inline form
└── features/
    └── events/
        └── actions.ts                    ← CHANGE: add updateEvent action (exists, verify)
```

---

## Phase 0: Research — Gap Analysis

### Gap 1 — Public event browsing (FR-012 violation)

**Finding**: `src/app/(attendee)/layout.tsx` checks `auth.getUser()` and redirects to `/login` if unauthenticated. Events pages live inside this layout group, so unauthenticated users cannot browse events.

**Fix**: Move `events/` and `events/[id]/` out of the `(attendee)` route group into the root `app/` directory. These pages should use `createClient()` for optional auth context (to show "Register" vs "Login to register") but must NOT redirect on missing session.

**RLS impact**: `events` table already has `"Published events visible to authenticated users"` policy — this requires `auth.uid() IS NOT NULL`. Must change to allow unauthenticated reads for published events.

**SQL required**:
```sql
DROP POLICY IF EXISTS "Published events visible to authenticated users" ON public.events;
CREATE POLICY "Published events visible to all"
  ON public.events FOR SELECT
  USING (status = 'published');
```

---

### Gap 2 — Edit event form missing

**Finding**: `updateEvent` Server Action exists in `src/features/events/actions.ts` but there is no UI form for it. The organizer event detail page shows name, date, location but has no "Edit" button.

**Fix**: Create `src/app/organizer/events/[id]/edit/page.tsx` with a pre-filled form that calls `updateEvent`. Add "Edit" button on the organizer event detail page (visible only in draft/published status, not cancelled).

---

### Gap 3 — Check-in scanner not discoverable

**Finding**: Scanner link is on the organizer event detail page (`/organizer/events/[id]`) inside the emerald banner — only visible if the event is published. Staff role users have no direct way to reach the scanner without going through the event list.

**Fix**: Add a dedicated "Check-in" item in the organizer/staff navigation. Also ensure the check-in page (`/organizer/events/[id]/checkin`) doesn't require the user to know the event ID — add a quick-link list of active (published) events on the check-in index page.

---

### Gap 4 — Login page doesn't redirect authenticated users

**Finding**: `src/app/(auth)/login/page.tsx` renders the login form unconditionally. If a logged-in user navigates to `/login`, they see the form and get confused.

**Fix**: Add a server-side auth check at the top of the login page. If `user` exists, `redirect('/events')`.

---

### Gap 5 — Role-differentiated UI

**Finding**: The nav shows the same items for all authenticated users except the "Ban tổ chức" link for organizers/staff. The landing page has no role-specific content. After login, both attendee and organizer land on the same page.

**Fix**:
- Landing page (`/`): show role-aware CTA — attendee sees "Browse Events", organizer sees "Manage Events" + "Browse Events"
- After login callback: redirect organizer to `/organizer`, attendee to `/events`
- Nav: already has role-aware links; ensure "Ban tổ chức" is prominent for organizers

---

### Gap 6 — Visual polish

**Findings from audit**:
- Landing page is minimal (headline + two links)
- No favicon or branded logo
- Background is pure white — no visual hierarchy
- Event cards are functional but lack visual warmth
- No consistent color story beyond indigo primary

**Decisions**:
- **Logo**: SVG component with a stylized ticket/calendar icon + "EventApp" wordmark in indigo. No external font needed.
- **Landing page**: Hero section with gradient background (indigo-50 → white), feature cards (Bento Grid), and social proof section
- **Background**: Subtle dot/grid pattern on the main content area using CSS (`bg-dot-pattern` Tailwind plugin or inline SVG background)
- **Event cards**: Add a default gradient banner placeholder when `banner_image_url` is null
- **No new packages**: All polish via Tailwind utilities and inline SVG

---

## Phase 1: Design & Contracts

### Updated Route Contracts

| Route | Auth Required | Role | Description |
|-------|--------------|------|-------------|
| `GET /` | No | Any | Landing page — role-aware CTA |
| `GET /events` | No | Any | Public event list |
| `GET /events/[id]` | No | Any | Public event detail; "Register" prompts login if unauth |
| `GET /login` | No (redirect if authed) | — | Google sign-in |
| `GET /auth/callback` | No | — | PKCE exchange |
| `GET /tickets` | Yes | attendee | My tickets |
| `GET /tickets/[id]` | Yes | attendee | Ticket detail with QR |
| `GET /organizer` | Yes | organizer/staff | Dashboard |
| `GET /organizer/events/new` | Yes | organizer | Create event form |
| `GET /organizer/events/[id]` | Yes | organizer/staff | Event detail + ticket mgmt |
| `GET /organizer/events/[id]/edit` | Yes | organizer | **NEW** Edit event form |
| `GET /organizer/events/[id]/checkin` | Yes | organizer/staff | QR scanner |
| `GET /docs` | No | Any | Bilingual docs |

### Spec additions required

The following FR gaps were identified and need to be added to spec.md:

| ID | Requirement |
|----|-------------|
| **FR-012b** | The event list MUST be browsable by unauthenticated visitors; authentication is required only to register. |
| **FR-035** | An authenticated user visiting `/login` MUST be redirected to `/events`. |
| **FR-036** | After successful Google OAuth login, an organizer/staff MUST be redirected to `/organizer`; an attendee MUST be redirected to `/events`. |
| **FR-037** | Organizers MUST be able to edit event details (name, description, dates, location, banner) for events in Draft or Published status. |
| **FR-038** | The application MUST display a branded logo in the navigation header and browser tab (favicon). |
| **FR-039** | The landing page MUST present role-aware calls-to-action depending on authentication and role status. |

---

## Implementation Task Summary

### P0 — Correctness (must fix first)

| Task | File(s) | Change |
|------|---------|--------|
| **T-I2-01** | `supabase/all_migrations.sql` + Supabase Dashboard | Update events RLS: allow unauthenticated SELECT for published events |
| **T-I2-02** | `src/app/events/page.tsx` (new location) | Move events listing out of `(attendee)` group; no auth redirect |
| **T-I2-03** | `src/app/events/[id]/page.tsx` (new location) | Move event detail out of `(attendee)` group; show register CTA if unauth |
| **T-I2-04** | `src/app/(auth)/login/page.tsx` | Add auth check → redirect to `/events` if already signed in |
| **T-I2-05** | `src/app/auth/callback/route.ts` | Redirect organizer/staff to `/organizer` instead of `/events` after login |

### P1 — Missing organizer features

| Task | File(s) | Change |
|------|---------|--------|
| **T-I2-06** | `src/app/organizer/events/[id]/edit/page.tsx` | New: pre-filled edit form |
| **T-I2-07** | `src/components/organizer/edit-event-form.tsx` | New: client form calling `updateEvent` |
| **T-I2-08** | `src/app/organizer/events/[id]/page.tsx` | Add "Edit event" button → links to edit page |

### P2 — Visual polish

| Task | File(s) | Change |
|------|---------|--------|
| **T-I2-09** | `src/components/layout/app-logo.tsx` | New: SVG logo component |
| **T-I2-10** | `src/components/layout/site-nav.tsx` | Use AppLogo, tighten layout |
| **T-I2-11** | `src/app/page.tsx` | Rich landing page with hero, feature grid, role-aware CTA |
| **T-I2-12** | `src/app/globals.css` | Add subtle background pattern |
| **T-I2-13** | `src/components/events/event-card.tsx` | Gradient placeholder banner when no image |

### P3 — Role UX refinement

| Task | File(s) | Change |
|------|---------|--------|
| **T-I2-14** | `src/components/events/register-button.tsx` | If unauth: show "Đăng nhập để đăng ký" → links to `/login?next=/events/[id]` |
| **T-I2-15** | `src/app/(attendee)/layout.tsx` | Remove events/* (already moved to public); keep tickets/* guarded |

---

## Complexity Tracking

No constitution violations in this iteration.
