# Contracts: Route Handlers

**Phase**: 1 — Design
**Branch**: `001-event-registration`
**Date**: 2026-05-05

Route Handlers (`app/api/`) are used exclusively for:
1. The OAuth callback (Supabase PKCE flow)
2. Vercel Cron Job endpoint (notification scheduling)
3. QR check-in validation called from the check-in Client Component via `fetch`

All other mutations use Server Actions (see `server-actions.md`).

---

## `GET /auth/callback`

**File**: `src/app/(auth)/callback/route.ts`
**Purpose**: Handles the OAuth PKCE code exchange after Google redirects back.

**Query params**:
| Param | Type | Description |
|---|---|---|
| `code` | `string` | PKCE authorization code from Supabase |
| `next` | `string` | Optional redirect path after login (default: `/events`) |

**Behaviour**:
1. Call `supabase.auth.exchangeCodeForSession(code)`.
2. On success: set session cookie, redirect to `next` (validated to be a relative path).
3. On error: redirect to `/login?error=auth_failed`.

**Security**: The `next` parameter is validated to be a relative path (must start with `/` and not contain `://`) to prevent open redirect attacks.

---

## `POST /api/cron/send-reminders`

**File**: `src/app/api/cron/send-reminders/route.ts`
**Purpose**: Called by Vercel Cron Jobs every hour to send due reminder and cancellation emails.

**Authentication**: Vercel sends the `Authorization: Bearer {CRON_SECRET}` header automatically. The handler validates this at the start and returns `401` if missing or invalid.

**Request body**: None (Vercel Cron sends no body)

**Behaviour**:
1. Validate `Authorization` header against `process.env.CRON_SECRET`.
2. Query `notifications` where `status = 'pending'` AND `scheduled_at <= now() + 30 minutes` (30-minute lookahead window).
3. For each notification:
   a. Fetch attendee email and event details.
   b. Send email via Resend.
   c. Update `notifications.status = 'sent'`, `sent_at = now()` on success; `status = 'failed'` on error.
4. Return `200 { sent: N, failed: M }`.

**Idempotency**: The `status` field prevents re-sending already-sent notifications on repeated cron ticks.

**Response**:
```json
{ "sent": 12, "failed": 0 }
```

**Errors**:
- `401` — missing or invalid cron secret
- `500` — unexpected server error (Resend API down, etc.)

---

## `POST /api/check-in`

**File**: `src/app/api/check-in/route.ts`
**Purpose**: Real-time QR validation endpoint called by the check-in scanner Client Component.

**Authentication**: Requires a valid Supabase session cookie (same-site request from the check-in page). The handler reads the session and verifies `role = 'organizer' | 'staff'`.

**Request body**:
```json
{ "ticketId": "uuid-string" }
```

**Behaviour**:
1. Parse and validate `ticketId` as a UUID.
2. Verify session and role.
3. Call `validate_and_check_in(ticketId, staffId)` PostgreSQL RPC.
4. Return the result within 2 seconds.

**Response** (success):
```json
{
  "status": "valid",
  "attendeeName": "Nguyen Van A",
  "ticketType": "General Admission"
}
```

```json
{
  "status": "already_used",
  "checkedInAt": "2026-05-10T08:32:00Z",
  "attendeeName": "Nguyen Van A",
  "ticketType": "General Admission"
}
```

```json
{ "status": "cancelled" }
```

```json
{ "status": "not_found" }
```

**Errors**:
- `400` — invalid UUID format
- `401` — unauthenticated
- `403` — insufficient role
- `500` — database error

**Performance requirement**: Response within 2 seconds under normal network conditions (FR-024).

---

## `vercel.json` Cron Configuration

```json
{
  "crons": [
    {
      "path": "/api/cron/send-reminders",
      "schedule": "0 * * * *"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(self)" }
      ]
    }
  ]
}
```

Note: `camera=(self)` in `Permissions-Policy` is required to allow the check-in page to access the device camera for QR scanning.
