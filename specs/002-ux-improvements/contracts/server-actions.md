# Server Actions Contract: UX Improvements

**Feature Branch**: `002-ux-improvements`
**Date**: 2026-05-05

---

## Modified: `registerTicket`

**File**: `src/features/tickets/actions.ts`

```typescript
export async function registerTicket(
  ticketTypeId: string
): Promise<ActionResult<{ ticketId: string; qrDataUrl: string }>>
```

**Change**: After successful RPC `register_ticket`, fetch `event_id` from `ticket_types` and call:
```typescript
revalidatePath(`/events/${eventId}`)
```

**Error codes** (unchanged): `SOLD_OUT`, `ALREADY_REGISTERED`, `EVENT_NOT_PUBLISHED`, `UNAUTHENTICATED`

---

## Modified: `cancelTicket`

**File**: `src/features/tickets/actions.ts`

```typescript
export async function cancelTicket(ticketId: string): Promise<ActionResult<void>>
```

**Change**: After successful UPDATE, call:
```typescript
revalidatePath(`/events/${eventId}`)    // from ticket_types.event_id
revalidatePath(`/tickets`)
revalidatePath(`/tickets/${ticketId}`)
```

**Requires**: Add `event_id` to the existing select query:
```typescript
.select('attendee_id, status, ticket_types(event_id, events(start_at))')
```

**Error codes** (unchanged): `NOT_FOUND`, `FORBIDDEN`, `TICKET_NOT_ACTIVE`, `EVENT_ALREADY_STARTED`, `UNAUTHENTICATED`

---

## Modified: `checkInTicket`

**File**: `src/features/checkin/actions.ts`

```typescript
export async function checkInTicket(
  ticketId: string
): Promise<ActionResult<CheckInResult>>
```

**Change**: After successful RPC `validate_and_check_in` returns `status: 'valid'`, call:
```typescript
revalidatePath(`/organizer/events/${eventId}`)
```

**Requires**: Fetch `event_id` from the RPC result or a separate query. The RPC currently returns `ticket.event_name` — needs to also return `event_id` (or query separately after the RPC).

**Result statuses** (unchanged): `valid`, `already_used`, `cancelled`, `not_found`

---

## New: `signInWithEmail`

**File**: `src/features/auth/actions.ts`

```typescript
export async function signInWithEmail(
  email: string,
  password: string
): Promise<ActionResult<void>>
```

**Input validation**:
- `email`: must be a valid email format (zod `z.string().email()`)
- `password`: must be non-empty string, min 1 char (server-side)

**Happy path**:
1. Call `supabase.auth.signInWithPassword({ email, password })`
2. On success, fetch `profiles.role` for the authenticated user
3. Redirect to `/organizer` if `role === 'organizer' || role === 'staff'`, else `/events`

**Error path**:
- Any Supabase auth error → return `{ data: null, error: 'INVALID_CREDENTIALS' }`
- Do **not** expose the specific reason (wrong email vs wrong password)

**Return type**:
```typescript
type ActionResult<T> =
  | { data: T; error: null }
  | { data: null; error: string }
```

**Error codes**:
| Code | Meaning |
|------|---------|
| `INVALID_CREDENTIALS` | Wrong email or password (generic, no enumeration) |
| `VALIDATION_ERROR` | Malformed email input |

**Security**: This action uses `createClient()` (server-side Supabase client with anon key). Rate limiting is provided by Supabase Auth built-in protection. No custom throttling needed.

---

## Modified: `CancelTicketButton` (client component)

**File**: `src/components/tickets/cancel-ticket-button.tsx`

**Change**: After successful cancellation, call `router.refresh()` before `router.push('/tickets')`:
```typescript
router.refresh()
router.push('/tickets')
```

This ensures the `/tickets` list page renders the updated status even on same-session navigation.
