-- 006_notifications.sql
-- Creates notification enums, notifications table, and RLS (service-role only from client)

CREATE TYPE notification_type AS ENUM ('reminder_24h', 'reminder_1h', 'cancellation');
CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'failed', 'cancelled');

CREATE TABLE public.notifications (
  id           uuid                NOT NULL DEFAULT gen_random_uuid(),
  attendee_id  uuid                NOT NULL REFERENCES public.profiles(id),
  event_id     uuid                NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  ticket_id    uuid                REFERENCES public.tickets(id),
  type         notification_type   NOT NULL,
  scheduled_at timestamptz         NOT NULL,
  sent_at      timestamptz,
  status       notification_status NOT NULL DEFAULT 'pending',
  created_at   timestamptz         NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  -- Prevent duplicate notification records for the same type per attendee per event
  UNIQUE (attendee_id, event_id, type)
);

CREATE INDEX idx_notifications_pending ON public.notifications (status, scheduled_at)
  WHERE status = 'pending';

-- RLS: client has no direct access — all operations via service-role key in Route Handlers
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- No client-accessible policies: only service-role (bypasses RLS) can access this table
