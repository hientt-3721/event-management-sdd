# Data Model: UX Improvements — Real-time Updates, Full i18n, Email/Password Auth & Docs Redesign

**Feature Branch**: `002-ux-improvements`
**Date**: 2026-05-05

---

## Schema Changes

This feature is **additive-only** — no existing tables or columns are modified. Only one new concern arises: tracking that demo accounts have been created.

### No schema migrations required

| Concern | Resolution |
|---------|-----------|
| Email/password auth | Supabase Auth handles user records (`auth.users`). Existing `profiles` table already stores `role`. Demo accounts are created via Supabase Dashboard, no migration needed. |
| Language preference | Stored as `NEXT_LOCALE` cookie client-side. No database column needed. |
| Docs content | Static content in component. No database table needed. |
| Revalidation | Server-side Next.js cache. No schema change. |

---

## Existing Entities (read-only reference for this feature)

### `profiles`

```sql
id          uuid    PK (references auth.users)
role        text    CHECK IN ('attendee', 'organizer', 'staff')
display_name text
email       text
avatar_url  text
created_at  timestamptz
```

Used in: role-based redirect after email/password login.

### `tickets`

```sql
id             uuid    PK
attendee_id    uuid    FK → profiles.id
ticket_type_id uuid    FK → ticket_types.id
status         text    CHECK IN ('active', 'used', 'cancelled')
qr_data        text
registered_at  timestamptz
cancelled_at   timestamptz
used_at        timestamptz
```

Affected by: `revalidatePath` after `cancelTicket`, `registerTicket`, `checkInTicket`.

### `ticket_types`

```sql
id         uuid    PK
event_id   uuid    FK → events.id
name       text
quantity   int
```

Used in: deriving `event_id` inside `registerTicket` for `revalidatePath`.

### `events`

```sql
id           uuid    PK
organizer_id uuid    FK → profiles.id
name         text
status       text    CHECK IN ('draft', 'published', 'cancelled')
start_at     timestamptz
end_at       timestamptz
location     text
```

Affected by: `revalidatePath('/events/[id]')` and `revalidatePath('/organizer/events/[id]')`.

---

## Client-side State (not persisted)

### Language Preference Cookie

```
Name:     NEXT_LOCALE
Values:   'vi' | 'en'
Path:     /
Max-Age:  31536000  (1 year)
SameSite: Lax
HttpOnly: false  (must be readable by LangSwitcher client component)
```

Set by: `LangSwitcher` component via `document.cookie`.
Read by: `src/i18n/request.ts` on every server render.

---

## Demo Accounts (to be created in Supabase Auth Dashboard)

| Role | Email | Password | Profile.role |
|------|-------|----------|-------------|
| Attendee | `demo@attendee.com` | `Demo1234!` | `attendee` |
| Organizer | `demo@organizer.com` | `Demo1234!` | `organizer` |

**Setup steps (manual, one-time):**
1. Supabase Dashboard → Authentication → Users → "Add user" for each email/password
2. Copy the UUID of each created user
3. Run `INSERT INTO profiles (id, role, display_name, email) VALUES ('<uuid>', 'attendee', 'Demo Attendee', 'demo@attendee.com')` (and equivalent for organizer)
4. Verify login works via the app

---

## Revalidation Paths Reference

| Trigger | `revalidatePath` calls |
|---------|----------------------|
| `registerTicket(ticketTypeId)` | `/events/${eventId}` |
| `cancelTicket(ticketId)` | `/events/${eventId}`, `/tickets`, `/tickets/${ticketId}` |
| `checkInTicket(ticketId)` | `/organizer/events/${eventId}` |

`eventId` derivation:
- In `registerTicket`: fetch `ticket_types.event_id` after getting `ticketTypeId`
- In `cancelTicket`: already fetched — `t.ticket_types.event_id` (need to add `event_id` to the select)
- In `checkInTicket`: RPC `validate_and_check_in` returns ticket data including related event

---

## Component Architecture Changes

### New: `src/components/layout/lang-switcher.tsx`
Moved from `src/components/docs/lang-switcher.tsx` to global layout. Accepts `currentLang` prop.

### Modified: `src/components/layout/site-nav.tsx`
Add `<LangSwitcher currentLang={locale} />` in the nav. Read `locale` from cookie via `cookies()` (server-side).

### Modified: `src/app/(auth)/login/page.tsx`
Convert to Client Component. Add email + password form alongside Google button. Wire to `signInWithEmail` server action.

### New: `src/features/auth/actions.ts` — `signInWithEmail`
```typescript
export async function signInWithEmail(email: string, password: string): Promise<ActionResult<void>>
```

### Modified: `src/app/docs/page.tsx`
Full redesign. Server Component for locale reading; delegates interactive elements (copy, password reveal) to child Client Components.

### New Client Sub-components (all in `src/components/docs/`)
- `terminal-block.tsx` — dark code block with copy-to-clipboard
- `demo-accounts.tsx` — account cards with toggleable password
- `docs-nav.tsx` — sidebar/top navigation with anchor links
