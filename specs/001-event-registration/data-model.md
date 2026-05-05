# Data Model: Event Registration Application

**Phase**: 1 — Design
**Branch**: `001-event-registration`
**Date**: 2026-05-05

---

## Entity Relationship Overview

```
auth.users (Supabase managed)
    │
    ↓ 1:1
profiles
    │
    ├── 1:N ──→ events (as organizer)
    ├── 1:N ──→ tickets (as attendee)
    └── 1:N ──→ check_ins (as staff)

events
    ├── 1:N ──→ ticket_types
    └── 1:N ──→ notifications

ticket_types
    └── 1:N ──→ tickets

tickets
    ├── 0:1 ──→ check_ins
    └── 1:N ──→ notifications
```

---

## Tables

### `profiles`

Extends `auth.users`. Created automatically via a Supabase database trigger on `auth.users` INSERT.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK, FK → `auth.users.id` ON DELETE CASCADE | Matches Supabase Auth user ID |
| `display_name` | `text` | NOT NULL | From Google identity token |
| `avatar_url` | `text` | NULLABLE | Profile picture URL from Google |
| `role` | `user_role` (enum) | NOT NULL, DEFAULT `'attendee'` | `attendee` \| `organizer` \| `staff` |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | |

**Enum**: `user_role` — `('attendee', 'organizer', 'staff')`

**RLS Policies**:
- `SELECT`: Authenticated user can read their own profile. Organizers can read all profiles.
- `UPDATE`: Authenticated user can update their own `display_name` and `avatar_url` only. Role changes require service-role key (admin only).
- `INSERT`: Blocked from client; handled by database trigger.

**Trigger**: `on_auth_user_created` — `AFTER INSERT ON auth.users` → inserts a row into `profiles` with `id`, `display_name` (from `raw_user_meta_data->>'full_name'`), `avatar_url` (from `raw_user_meta_data->>'avatar_url'`), `role = 'attendee'`.

---

### `events`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK, DEFAULT `gen_random_uuid()` | |
| `organizer_id` | `uuid` | NOT NULL, FK → `profiles.id` | |
| `name` | `text` | NOT NULL | |
| `description` | `text` | NOT NULL | |
| `start_at` | `timestamptz` | NOT NULL | |
| `end_at` | `timestamptz` | NOT NULL, CHECK `end_at > start_at` | |
| `location` | `text` | NOT NULL | Free-text venue description |
| `banner_image_url` | `text` | NULLABLE | Supabase Storage public URL |
| `status` | `event_status` (enum) | NOT NULL, DEFAULT `'draft'` | `draft` \| `published` \| `cancelled` |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | Updated by trigger |

**Enum**: `event_status` — `('draft', 'published', 'cancelled')`

**Indexes**: `(status, start_at)` — covers the public event list query.

**RLS Policies**:
- `SELECT`: Published events are visible to all authenticated users. Draft/cancelled events visible only to the organizer.
- `INSERT`: Authenticated users with role `organizer`.
- `UPDATE`: Organizer of the event only.
- `DELETE`: Blocked; use `status = 'cancelled'` instead.

**State Transitions**:
```
draft → published   (organizer action; requires ≥ 1 ticket type)
draft → cancelled   (organizer action)
published → cancelled (organizer action; triggers notification to all registrants)
```
Transitions `published → draft` and `cancelled → *` are not permitted.

---

### `ticket_types`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK, DEFAULT `gen_random_uuid()` | |
| `event_id` | `uuid` | NOT NULL, FK → `events.id` ON DELETE CASCADE | |
| `name` | `text` | NOT NULL | e.g. "General Admission", "VIP" |
| `description` | `text` | NULLABLE | |
| `total_quantity` | `integer` | NOT NULL, CHECK `> 0` | Maximum tickets for this type |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | |

**Derived field** (view / function): `issued_count` — count of `tickets` with `ticket_type_id = id` and `status != 'cancelled'`.

**Constraint**: When an organizer reduces `total_quantity`, a CHECK is enforced via a PostgreSQL function: `total_quantity >= (SELECT COUNT(*) FROM tickets WHERE ticket_type_id = id AND status != 'cancelled')`.

**RLS Policies**:
- `SELECT`: Any authenticated user can read ticket types for published events. Organizer can read all ticket types for their events.
- `INSERT` / `UPDATE` / `DELETE`: Organizer of the parent event only, and only when event `status = 'draft'`.

---

### `tickets`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK, DEFAULT `gen_random_uuid()` | This UUID is the QR code payload |
| `attendee_id` | `uuid` | NOT NULL, FK → `profiles.id` | |
| `ticket_type_id` | `uuid` | NOT NULL, FK → `ticket_types.id` | |
| `status` | `ticket_status` (enum) | NOT NULL, DEFAULT `'active'` | `active` \| `used` \| `cancelled` |
| `registered_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | |
| `cancelled_at` | `timestamptz` | NULLABLE | Set when status → `cancelled` |

**Enum**: `ticket_status` — `('active', 'used', 'cancelled')`

**Unique constraint**: `(attendee_id, ticket_type_id's event_id)` — enforced via a UNIQUE index on `(attendee_id, event_id_from_ticket_type)`. In practice implemented as a partial unique index or via the `register_ticket` RPC which checks before inserting.

**RLS Policies**:
- `SELECT`: Attendee can read their own tickets. Organizer can read all tickets for their events.
- `INSERT`: Blocked from client; handled exclusively by `register_ticket` RPC (service-role context).
- `UPDATE`: Attendee can set `status = 'cancelled'` if `registered_at`'s event `start_at > now()`. Organizer can cancel all tickets for a cancelled event.
- `DELETE`: Blocked.

---

### `check_ins`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK, DEFAULT `gen_random_uuid()` | |
| `ticket_id` | `uuid` | NOT NULL, UNIQUE, FK → `tickets.id` | UNIQUE enforces single check-in |
| `scanned_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | |
| `scanned_by` | `uuid` | NULLABLE, FK → `profiles.id` | Staff user who performed the scan |

**RLS Policies**:
- `SELECT`: Organizer/staff can read check-ins for their events.
- `INSERT`: Organizer/staff roles only; handled by `validate_and_check_in` RPC.
- `UPDATE` / `DELETE`: Blocked.

---

### `notifications`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK, DEFAULT `gen_random_uuid()` | |
| `attendee_id` | `uuid` | NOT NULL, FK → `profiles.id` | |
| `event_id` | `uuid` | NOT NULL, FK → `events.id` ON DELETE CASCADE | |
| `ticket_id` | `uuid` | NULLABLE, FK → `tickets.id` | NULL for event-level cancellation notices |
| `type` | `notification_type` (enum) | NOT NULL | `reminder_24h` \| `reminder_1h` \| `cancellation` |
| `scheduled_at` | `timestamptz` | NOT NULL | When the email should be sent |
| `sent_at` | `timestamptz` | NULLABLE | NULL = not yet sent |
| `status` | `notification_status` (enum) | NOT NULL, DEFAULT `'pending'` | `pending` \| `sent` \| `failed` \| `cancelled` |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | |

**Enums**:
- `notification_type` — `('reminder_24h', 'reminder_1h', 'cancellation')`
- `notification_status` — `('pending', 'sent', 'failed', 'cancelled')`

**Unique constraint**: `(attendee_id, event_id, type)` — prevents duplicate notification records for the same type.

**RLS Policies**:
- All operations via service-role key only (called from Route Handler). Client has no direct access.

---

## PostgreSQL Functions (RPCs)

### `register_ticket(p_attendee_id uuid, p_ticket_type_id uuid) → uuid`

**Purpose**: Atomically reserve one ticket, preventing overbooking and duplicate registration.

**Logic**:
1. Check that no active/used ticket exists for `p_attendee_id` in the same event (returns error `ALREADY_REGISTERED`).
2. Lock the `ticket_types` row with `SELECT ... FOR UPDATE`.
3. Count non-cancelled tickets for this type; if count ≥ `total_quantity`, raise `SOLD_OUT`.
4. Insert into `tickets`, returning the new `id`.
5. Schedule two notification rows (24 h and 1 h reminders) for the attendee.

**Security**: `SECURITY DEFINER`, called via Supabase RPC. The RLS on `tickets` blocks direct INSERT.

---

### `validate_and_check_in(p_ticket_id uuid, p_staff_id uuid) → json`

**Purpose**: Validate a ticket and record the check-in atomically.

**Returns**: `{ status: 'valid' | 'already_used' | 'cancelled' | 'not_found', attendee_name: text, ticket_type: text, checked_in_at: timestamptz? }`

**Logic**:
1. Look up ticket by `p_ticket_id`; if not found, return `not_found`.
2. If `status = 'cancelled'`, return `cancelled`.
3. If `status = 'used'`, return `already_used` with the original `scanned_at` from `check_ins`.
4. Lock ticket row with `SELECT ... FOR UPDATE`.
5. Re-verify `status = 'active'` (guard against concurrent scan).
6. Update `tickets.status = 'used'`, insert into `check_ins`.
7. Return `valid` with attendee name and ticket type.

**Security**: `SECURITY DEFINER`. Called by the `/api/check-in` Route Handler (server-side only).

---

## Storage Buckets

| Bucket | Access | Description |
|---|---|---|
| `event-banners` | Public read, authenticated write (organizer) | Event banner images ≤ 5 MB, JPEG/PNG only |

**Storage Policy**: Organizers may upload to `event-banners/{event_id}/*`. Public can read any file in the bucket.

---

## Supabase Realtime

| Table | Events | Used by |
|---|---|---|
| `tickets` | INSERT | Organizer attendee list (real-time count update) |
| `check_ins` | INSERT | Organizer attendee list (check-in status update) |

Realtime subscriptions are client-side only (`"use client"`) using the browser Supabase client.
