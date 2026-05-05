# Research: Event Registration Application

**Phase**: 0 — Research
**Branch**: `001-event-registration`
**Date**: 2026-05-05
**Status**: Complete — all unknowns resolved

---

## 1. QR Code Generation Strategy

**Decision**: Server-side QR generation using the `qrcode` npm package, producing a base64 PNG data URL stored as a field on the `Ticket` record.

**Rationale**:
- Generating server-side (in a Server Action or API route) means the QR image is never constructed from user input on the client, eliminating injection vectors.
- `qrcode` is the most mature and widely used QR generation library in the Node.js ecosystem (>10M downloads/week). It runs in the Node runtime used by Vercel.
- Storing the data URL in the database means the ticket page renders without a round-trip to regenerate the QR on every visit.
- Per FR-017, the QR payload is exclusively the ticket UUID — no personal data is encoded.

**Alternatives considered**:
- `react-qr-code` — client-side only; unsuitable because it runs in the browser where we cannot guarantee integrity.
- `qr-code-styling` — adds styling/logo features we do not need; adds unnecessary bundle size.

---

## 2. Atomic Ticket Reservation (Overbooking Prevention)

**Decision**: Implement a PostgreSQL stored procedure (Supabase RPC) that performs the capacity check and ticket INSERT atomically within a single transaction, using `SELECT ... FOR UPDATE` on the `ticket_types` row.

**Rationale**:
- A concurrent application-level check-then-insert would have a time-of-check/time-of-use (TOCTOU) race condition.
- By moving the check inside a PostgreSQL function, the database serialises concurrent registrations for the same ticket type automatically via row-level locking.
- The function returns either the new `ticket_id` or raises an exception if capacity is exhausted, which the Server Action can propagate to the client.
- This pattern is idiomatic for Supabase and does not require any external queue or locking service.

**Function signature** (conceptual):
```sql
CREATE OR REPLACE FUNCTION register_ticket(
  p_attendee_id  uuid,
  p_ticket_type_id uuid
) RETURNS uuid
```

**Alternatives considered**:
- Optimistic locking with a `version` column — more complex and still requires a retry loop on the client.
- Application-level Redis lock — adds infrastructure dependency; not supported natively on Vercel without additional services.

---

## 3. Scheduled Reminder Notifications

**Decision**: Vercel Cron Jobs (configured in `vercel.json`) calling a protected Route Handler `POST /api/cron/send-reminders`. The handler queries the database for tickets requiring reminders (24 h window and 1 h window) and sends emails via the Resend API.

**Rationale**:
- Vercel Cron Jobs run on a standard cron schedule with no additional infrastructure. They call a Route Handler in the same Next.js project, keeping everything in one deployment unit.
- The Route Handler is protected by a `CRON_SECRET` header checked at the start of every invocation (Vercel automatically sends this).
- Resend provides a simple, well-documented email API with a generous free tier suitable for v1. It has a first-class Node.js/TypeScript SDK.
- The `notifications` table tracks scheduled/sent status so the cron handler is idempotent — re-running does not send duplicate emails.

**Cron schedule** (in `vercel.json`):
```json
{ "path": "/api/cron/send-reminders", "schedule": "0 * * * *" }
```
Runs every hour; the handler selects tickets whose event starts in 24 ± 0.5 hours and 1 ± 0.5 hours.

**Alternatives considered**:
- Supabase `pg_cron` extension — would require a Supabase Edge Function to send HTTP requests; more complex to debug and monitor.
- Supabase Edge Functions with Deno.cron — requires Supabase Pro plan; less transparent logging than Vercel.
- External services (Inngest, Trigger.dev) — adds cost and dependency; overkill for v1.

---

## 4. Camera-Based QR Code Scanning

**Decision**: `html5-qrcode` library for in-browser camera QR scanning on the check-in page.

**Rationale**:
- `html5-qrcode` is the most battle-tested web QR scanner library (>4M downloads/week), supporting all modern browsers including mobile Safari and Chrome on Android.
- It abstracts camera permission handling and scanning loop, exposing a simple callback API.
- It works as a Client Component (`"use client"`) in Next.js App Router without SSR issues by using a dynamic import with `ssr: false`.
- The fallback manual input (FR-023) is a simple `<input>` field alongside the scanner component.

**Alternatives considered**:
- `@zxing/browser` — lower-level, requires more boilerplate to set up the camera feed.
- Native `BarcodeDetector` browser API — not supported in Firefox; too fragile for a check-in use case.

---

## 5. Internationalisation for Documentation Site

**Decision**: `next-intl` with locale-based routing under `/[locale]/docs/...`. Supported locales: `vi` (default, redirected from `/docs`), `en`. Translation messages stored as JSON files in `messages/vi.json` and `messages/en.json`.

**Rationale**:
- `next-intl` is the leading i18n library for Next.js App Router. It supports Server Components natively, meaning translations are rendered server-side with no layout shift.
- Locale-based routing (`/vi/docs`, `/en/docs`) makes each language version independently linkable and crawlable by search engines.
- The language toggle stores the locale preference in a cookie so it persists across navigation within a session (satisfying US6 AC3).
- JSON message files are easy for non-developers to translate and update.

**Alternatives considered**:
- `next-i18next` — designed for the Pages Router; requires workarounds for App Router.
- Custom cookie-based language switch without URL change — poor for SEO and direct linking.
- Separate Vercel project for docs — adds deployment complexity; unnecessary for v1.

---

## 6. Bento Grid Layout Implementation

**Decision**: Custom CSS Grid utilities defined in `tailwind.config.ts` (`gridTemplateAreas`, `gridColumn`, `gridRow` extensions) applied via Tailwind class names. No third-party grid library.

**Rationale**:
- Pure Tailwind keeps the styling layer consistent and avoids a JavaScript dependency for layout.
- CSS Grid `grid-template-areas` allows named, semantic regions that reflow at breakpoints by simply redefining the template areas in responsive variants.
- The `@tailwindcss/container-queries` plugin enables card-level responsive behaviour so a card adapts when its grid cell resizes, not just when the viewport resizes.

**Card span conventions**:
| Grid column count | Available spans |
|---|---|
| Mobile (1 col) | always full width |
| Tablet (2 col) | `col-span-1`, `col-span-2` |
| Desktop (4 col) | `col-span-1`, `col-span-2`, `col-span-3`, `col-span-4` |

**Alternatives considered**:
- Masonry layout libraries (e.g. `react-masonry-css`) — animated reflow without stable positions is poor UX for a data dashboard.
- Flexbox-only approach — cannot achieve the intentional "irregular card size" aesthetic that defines Bento Grid.

---

## 7. Supabase Auth + Google OAuth with Next.js App Router

**Decision**: Use `@supabase/ssr` for server-side Supabase client creation. Google OAuth is configured as a provider in the Supabase dashboard. The callback is handled at `GET /auth/callback` using Supabase's PKCE flow. Session is stored in cookies and refreshed via Next.js middleware.

**Rationale**:
- `@supabase/ssr` is Supabase's official package for server-side rendering frameworks. It correctly handles cookie-based sessions and PKCE without the deprecated `@supabase/auth-helpers-nextjs`.
- Middleware (`src/middleware.ts`) intercepts every request, refreshes the session if the token is near expiry, and redirects unauthenticated users away from protected routes.
- PKCE flow is required for server-side OAuth; the implicit flow is deprecated in Supabase.

**Alternatives considered**:
- `@supabase/auth-helpers-nextjs` — deprecated in favour of `@supabase/ssr`.
- NextAuth.js — adds a separate auth layer on top of Supabase; creates duplication since Supabase Auth already handles Google OAuth natively.

---

## 8. Role Management

**Decision**: User roles (attendee, organizer, staff) are stored in a `profiles` table (extending `auth.users`) with a `role` enum column. The Supabase middleware reads the role from the profile and attaches it to the session; route protection is enforced in the Next.js middleware and re-checked in Server Actions.

**Rationale**:
- Keeping roles in the database (with RLS) means role checks are enforced at the data layer, not just at the UI layer — a compromised client cannot escalate privileges.
- The spec states that organizer role is manually assigned by an admin, so there is no self-service role escalation path.
- A single `profiles` table is simpler than a separate roles/permissions table for the v1 scope.

**Alternatives considered**:
- Supabase Auth custom claims (JWT metadata) — requires a database webhook to keep JWTs fresh after role changes; overly complex for v1.
- Separate `user_roles` join table — unnecessary indirection when each user has exactly one role.
