# Contracts: Server Actions

**Phase**: 1 — Design
**Branch**: `001-event-registration`
**Date**: 2026-05-05

Server Actions are the primary data-mutation interface between Client Components and the database. All Server Actions are defined in `src/features/*/actions.ts` and called directly from Client Components or from Server Components.

Conventions:
- Every action returns `{ data: T | null; error: string | null }`.
- Input is validated with `zod` before any database operation.
- The calling user's session is retrieved via `createServerClient()` at the start of every action; unauthenticated calls return `{ data: null, error: 'UNAUTHENTICATED' }`.
- Role-specific actions check `profile.role` and return `{ data: null, error: 'FORBIDDEN' }` on mismatch.

---

## Auth Actions (`src/features/auth/actions.ts`)

### `signIn()`
**Trigger**: "Sign in with Google" button click  
**Input**: none  
**Behaviour**: Calls `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: '/auth/callback' } })`  
**Returns**: Redirect (no explicit return value; browser follows the OAuth redirect)  
**Errors**: —

### `signOut()`
**Trigger**: "Sign out" button click  
**Input**: none  
**Behaviour**: Calls `supabase.auth.signOut()`, then `redirect('/')`  
**Returns**: Redirect  
**Errors**: —

---

## Event Actions (`src/features/events/actions.ts`)

### `createEvent(input: CreateEventInput) → ActionResult<{ id: string }>`

**Roles allowed**: `organizer`

**Input schema** (`CreateEventInput`):
```typescript
{
  name: string          // 1–200 chars
  description: string   // 1–5000 chars
  start_at: string      // ISO 8601 datetime
  end_at: string        // ISO 8601 datetime, must be > start_at
  location: string      // 1–500 chars
  banner_image_url?: string  // valid URL, nullable
}
```

**Behaviour**:
1. Validate input with zod.
2. Insert into `events` with `status = 'draft'`, `organizer_id = session.user.id`.
3. Return `{ data: { id }, error: null }`.

**Errors**: `VALIDATION_ERROR`, `FORBIDDEN`, `UNAUTHENTICATED`

---

### `updateEvent(id: string, input: UpdateEventInput) → ActionResult<void>`

**Roles allowed**: `organizer` (owner only)

**Input schema**: Partial `CreateEventInput` — any subset of fields.

**Behaviour**: Updates the event row. Only allowed when `status != 'cancelled'`.

**Errors**: `NOT_FOUND`, `FORBIDDEN`, `VALIDATION_ERROR`, `EVENT_CANCELLED`

---

### `publishEvent(id: string) → ActionResult<void>`

**Roles allowed**: `organizer` (owner only)

**Behaviour**:
1. Verify event has at least one `ticket_type`.
2. Set `status = 'published'`.
3. Schedule `reminder_24h` and `reminder_1h` notification rows for all *existing* tickets (should be none at draft, but handles edge cases).

**Errors**: `NOT_FOUND`, `FORBIDDEN`, `NO_TICKET_TYPES`, `ALREADY_PUBLISHED`

---

### `cancelEvent(id: string) → ActionResult<void>`

**Roles allowed**: `organizer` (owner only)

**Behaviour**:
1. Set `status = 'cancelled'`.
2. Set all `tickets.status = 'cancelled'` for this event.
3. Insert `cancellation` notification rows for all affected attendees (sent immediately by the cron handler on its next tick, or triggered inline).
4. Mark pending `reminder_*` notifications as `cancelled`.

**Errors**: `NOT_FOUND`, `FORBIDDEN`, `ALREADY_CANCELLED`

---

### `addTicketType(eventId: string, input: TicketTypeInput) → ActionResult<{ id: string }>`

**Roles allowed**: `organizer` (owner only)

**Input schema** (`TicketTypeInput`):
```typescript
{
  name: string           // 1–100 chars
  description?: string   // 0–500 chars
  total_quantity: number // integer, 1–100 000
}
```

**Behaviour**: Insert into `ticket_types`. Only when event `status = 'draft'`.

**Errors**: `NOT_FOUND`, `FORBIDDEN`, `EVENT_NOT_DRAFT`, `VALIDATION_ERROR`

---

### `updateTicketType(id: string, input: Partial<TicketTypeInput>) → ActionResult<void>`

**Roles allowed**: `organizer` (owner of parent event)

**Behaviour**: Updates ticket type. Validates that reducing `total_quantity` does not go below the number of already-issued tickets.

**Errors**: `NOT_FOUND`, `FORBIDDEN`, `QUANTITY_BELOW_ISSUED`, `EVENT_NOT_DRAFT`

---

### `deleteTicketType(id: string) → ActionResult<void>`

**Roles allowed**: `organizer` (owner only)

**Behaviour**: Deletes ticket type if zero tickets have been issued. Only when event `status = 'draft'`.

**Errors**: `NOT_FOUND`, `FORBIDDEN`, `HAS_ISSUED_TICKETS`, `EVENT_NOT_DRAFT`

---

## Ticket Actions (`src/features/tickets/actions.ts`)

### `registerTicket(ticketTypeId: string) → ActionResult<{ ticketId: string; qrDataUrl: string }>`

**Roles allowed**: `attendee`, `organizer`, `staff` (any authenticated user)

**Behaviour**:
1. Call `register_ticket(attendee_id, ticket_type_id)` PostgreSQL RPC.
2. If RPC returns `SOLD_OUT` or `ALREADY_REGISTERED`, propagate as error.
3. On success, call `generateQrDataUrl(ticketId)` and return both `ticketId` and `qrDataUrl`.
4. The `qrDataUrl` is **not** persisted — it is generated on demand. (QR is regenerated when viewing the ticket detail page.)

**Errors**: `UNAUTHENTICATED`, `SOLD_OUT`, `ALREADY_REGISTERED`, `EVENT_NOT_PUBLISHED`

---

### `cancelTicket(ticketId: string) → ActionResult<void>`

**Roles allowed**: Ticket owner (attendee)

**Behaviour**:
1. Verify `ticket.attendee_id = session.user.id`.
2. Verify `ticket.status = 'active'`.
3. Verify event `start_at > now()`.
4. Set `ticket.status = 'cancelled'`, `cancelled_at = now()`.
5. Mark any pending reminder notifications for this ticket as `cancelled`.

**Errors**: `NOT_FOUND`, `FORBIDDEN`, `TICKET_NOT_ACTIVE`, `EVENT_ALREADY_STARTED`

---

## Check-In Actions (`src/features/check-in/actions.ts`)

### `validateTicket(ticketId: string) → ActionResult<CheckInResult>`

**Roles allowed**: `organizer`, `staff`

**Behaviour**: Calls `validate_and_check_in(ticket_id, staff_id)` PostgreSQL RPC.

**Returns** (`CheckInResult`):
```typescript
{
  status: 'valid' | 'already_used' | 'cancelled' | 'not_found'
  attendeeName?: string
  ticketType?: string
  checkedInAt?: string   // ISO 8601, present when status = 'already_used'
}
```

**Errors**: `UNAUTHENTICATED`, `FORBIDDEN`
