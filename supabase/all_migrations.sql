-- ============================================================
-- RESET (idempotent — safe to run multiple times)
-- ============================================================
DROP TABLE IF EXISTS public.notifications  CASCADE;
DROP TABLE IF EXISTS public.check_ins      CASCADE;
DROP TABLE IF EXISTS public.tickets        CASCADE;
DROP TABLE IF EXISTS public.ticket_types   CASCADE;
DROP TABLE IF EXISTS public.events         CASCADE;
DROP TABLE IF EXISTS public.profiles       CASCADE;

DROP FUNCTION IF EXISTS public.register_ticket(uuid, uuid)       CASCADE;
DROP FUNCTION IF EXISTS public.validate_and_check_in(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user()                 CASCADE;
DROP FUNCTION IF EXISTS public.set_updated_at()                  CASCADE;
DROP FUNCTION IF EXISTS public.check_ticket_type_quantity()      CASCADE;

DROP TYPE IF EXISTS public.notification_status CASCADE;
DROP TYPE IF EXISTS public.notification_type   CASCADE;
DROP TYPE IF EXISTS public.ticket_status       CASCADE;
DROP TYPE IF EXISTS public.event_status        CASCADE;
DROP TYPE IF EXISTS public.user_role           CASCADE;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- ============================================================
-- 001 — profiles
-- ============================================================
CREATE TYPE user_role AS ENUM ('attendee', 'organizer', 'staff');

CREATE TABLE public.profiles (
  id           uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text        NOT NULL DEFAULT '',
  avatar_url   text,
  role         user_role   NOT NULL DEFAULT 'attendee',
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, ''),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own display_name and avatar_url"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- 002 — events
-- ============================================================
CREATE TYPE event_status AS ENUM ('draft', 'published', 'cancelled');

CREATE TABLE public.events (
  id               uuid         NOT NULL DEFAULT gen_random_uuid(),
  organizer_id     uuid         NOT NULL REFERENCES public.profiles(id),
  name             text         NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  description      text         NOT NULL CHECK (char_length(description) BETWEEN 1 AND 5000),
  start_at         timestamptz  NOT NULL,
  end_at           timestamptz  NOT NULL,
  location         text         NOT NULL CHECK (char_length(location) BETWEEN 1 AND 500),
  banner_image_url text,
  status           event_status NOT NULL DEFAULT 'draft',
  created_at       timestamptz  NOT NULL DEFAULT now(),
  updated_at       timestamptz  NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT end_after_start CHECK (end_at > start_at)
);

CREATE INDEX idx_events_status_start ON public.events (status, start_at);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published events visible to all"
  ON public.events FOR SELECT
  USING (status = 'published');

CREATE POLICY "Organizers can read own events in any status"
  ON public.events FOR SELECT
  USING (organizer_id = auth.uid());

CREATE POLICY "Organizers can create events"
  ON public.events FOR INSERT
  WITH CHECK (
    organizer_id = auth.uid() AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'organizer')
  );

CREATE POLICY "Organizers can update own events"
  ON public.events FOR UPDATE
  USING (organizer_id = auth.uid())
  WITH CHECK (organizer_id = auth.uid());

-- ============================================================
-- 003 — ticket_types
-- ============================================================
CREATE TABLE public.ticket_types (
  id             uuid        NOT NULL DEFAULT gen_random_uuid(),
  event_id       uuid        NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name           text        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  description    text        CHECK (char_length(description) <= 500),
  total_quantity integer     NOT NULL CHECK (total_quantity > 0),
  created_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

ALTER TABLE public.ticket_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ticket types readable for published events"
  ON public.ticket_types FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND (e.status = 'published' OR e.organizer_id = auth.uid())
    )
  );

CREATE POLICY "Organizers can insert ticket types for own draft events"
  ON public.ticket_types FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND e.organizer_id = auth.uid() AND e.status = 'draft'
    )
  );

CREATE POLICY "Organizers can update ticket types for own draft events"
  ON public.ticket_types FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND e.organizer_id = auth.uid() AND e.status = 'draft'
    )
  );

-- ============================================================
-- 004 — tickets  (+ deferred objects that depend on this table)
-- ============================================================
CREATE TYPE ticket_status AS ENUM ('active', 'used', 'cancelled');

CREATE TABLE public.tickets (
  id             uuid          NOT NULL DEFAULT gen_random_uuid(),
  attendee_id    uuid          NOT NULL REFERENCES public.profiles(id),
  ticket_type_id uuid          NOT NULL REFERENCES public.ticket_types(id),
  status         ticket_status NOT NULL DEFAULT 'active',
  registered_at  timestamptz   NOT NULL DEFAULT now(),
  cancelled_at   timestamptz,
  PRIMARY KEY (id)
);

CREATE UNIQUE INDEX idx_tickets_unique_attendee_event
  ON public.tickets (attendee_id, ticket_type_id)
  WHERE status != 'cancelled';

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Attendees can read own tickets"
  ON public.tickets FOR SELECT
  USING (attendee_id = auth.uid());

CREATE POLICY "Organizers can read all tickets for their events"
  ON public.tickets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.ticket_types tt
      JOIN public.events e ON e.id = tt.event_id
      WHERE tt.id = ticket_type_id AND e.organizer_id = auth.uid()
    )
  );

CREATE POLICY "Attendees can cancel own tickets before event starts"
  ON public.tickets FOR UPDATE
  USING (
    attendee_id = auth.uid() AND
    status = 'active' AND
    EXISTS (
      SELECT 1 FROM public.ticket_types tt
      JOIN public.events e ON e.id = tt.event_id
      WHERE tt.id = ticket_type_id AND e.start_at > now()
    )
  )
  WITH CHECK (status = 'cancelled');

CREATE POLICY "Organizers can cancel all tickets for cancelled events"
  ON public.tickets FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.ticket_types tt
      JOIN public.events e ON e.id = tt.event_id
      WHERE tt.id = ticket_type_id
        AND e.organizer_id = auth.uid()
        AND e.status = 'cancelled'
    )
  );

-- Deferred from 003: needs public.tickets to exist first
CREATE POLICY "Organizers can delete ticket types with no issued tickets"
  ON public.ticket_types FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND e.organizer_id = auth.uid() AND e.status = 'draft'
    ) AND
    NOT EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.ticket_type_id = id AND t.status != 'cancelled'
    )
  );

-- Deferred from 003: needs public.tickets to exist first
CREATE OR REPLACE FUNCTION public.check_ticket_type_quantity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  issued_count integer;
BEGIN
  SELECT COUNT(*) INTO issued_count
  FROM public.tickets
  WHERE ticket_type_id = NEW.id AND status != 'cancelled';

  IF NEW.total_quantity < issued_count THEN
    RAISE EXCEPTION 'QUANTITY_BELOW_ISSUED: cannot reduce quantity below % (currently issued)', issued_count;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER ticket_type_quantity_guard
  BEFORE UPDATE ON public.ticket_types
  FOR EACH ROW
  WHEN (NEW.total_quantity < OLD.total_quantity)
  EXECUTE FUNCTION public.check_ticket_type_quantity();

-- ============================================================
-- 005 — check_ins
-- ============================================================
CREATE TABLE public.check_ins (
  id         uuid        NOT NULL DEFAULT gen_random_uuid(),
  ticket_id  uuid        NOT NULL UNIQUE REFERENCES public.tickets(id),
  scanned_at timestamptz NOT NULL DEFAULT now(),
  scanned_by uuid        REFERENCES public.profiles(id),
  PRIMARY KEY (id)
);

ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers and staff can read check-ins for their events"
  ON public.check_ins FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tickets t
      JOIN public.ticket_types tt ON tt.id = t.ticket_type_id
      JOIN public.events e ON e.id = tt.event_id
      WHERE t.id = ticket_id AND e.organizer_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('organizer', 'staff')
    )
  );

-- ============================================================
-- 006 — notifications
-- ============================================================
CREATE TYPE notification_type   AS ENUM ('reminder_24h', 'reminder_1h', 'cancellation');
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
  UNIQUE (attendee_id, event_id, type)
);

CREATE INDEX idx_notifications_pending
  ON public.notifications (status, scheduled_at)
  WHERE status = 'pending';

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
-- No client policies — service-role key bypasses RLS for this table

-- ============================================================
-- 007 — register_ticket RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.register_ticket(
  p_attendee_id    uuid,
  p_ticket_type_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id       uuid;
  v_event_status   event_status;
  v_total_quantity integer;
  v_issued_count   integer;
  v_ticket_id      uuid;
  v_event_start_at timestamptz;
BEGIN
  SELECT e.id, e.status, tt.total_quantity, e.start_at
  INTO v_event_id, v_event_status, v_total_quantity, v_event_start_at
  FROM public.ticket_types tt
  JOIN public.events e ON e.id = tt.event_id
  WHERE tt.id = p_ticket_type_id
  FOR UPDATE OF tt;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND: ticket type does not exist';
  END IF;

  IF v_event_status != 'published' THEN
    RAISE EXCEPTION 'EVENT_NOT_PUBLISHED: event is not accepting registrations';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.tickets t
    JOIN public.ticket_types tt ON tt.id = t.ticket_type_id
    WHERE tt.event_id = v_event_id
      AND t.attendee_id = p_attendee_id
      AND t.status != 'cancelled'
  ) THEN
    RAISE EXCEPTION 'ALREADY_REGISTERED: attendee already has a ticket for this event';
  END IF;

  SELECT COUNT(*) INTO v_issued_count
  FROM public.tickets
  WHERE ticket_type_id = p_ticket_type_id AND status != 'cancelled';

  IF v_issued_count >= v_total_quantity THEN
    RAISE EXCEPTION 'SOLD_OUT: no tickets remaining for this ticket type';
  END IF;

  INSERT INTO public.tickets (attendee_id, ticket_type_id)
  VALUES (p_attendee_id, p_ticket_type_id)
  RETURNING id INTO v_ticket_id;

  INSERT INTO public.notifications (attendee_id, event_id, ticket_id, type, scheduled_at)
  VALUES
    (p_attendee_id, v_event_id, v_ticket_id, 'reminder_24h', v_event_start_at - INTERVAL '24 hours'),
    (p_attendee_id, v_event_id, v_ticket_id, 'reminder_1h',  v_event_start_at - INTERVAL '1 hour')
  ON CONFLICT (attendee_id, event_id, type) DO NOTHING;

  RETURN v_ticket_id;
END;
$$;

-- ============================================================
-- 008 — validate_and_check_in RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.validate_and_check_in(
  p_ticket_id uuid,
  p_staff_id  uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket      record;
  v_existing_ci record;
BEGIN
  SELECT t.id, t.status, p.display_name, tt.name AS ticket_type_name
  INTO v_ticket
  FROM public.tickets t
  JOIN public.profiles p ON p.id = t.attendee_id
  JOIN public.ticket_types tt ON tt.id = t.ticket_type_id
  WHERE t.id = p_ticket_id;

  IF NOT FOUND THEN
    RETURN json_build_object('status', 'not_found');
  END IF;

  IF v_ticket.status = 'cancelled' THEN
    RETURN json_build_object(
      'status', 'cancelled',
      'attendeeName', v_ticket.display_name,
      'ticketType', v_ticket.ticket_type_name
    );
  END IF;

  IF v_ticket.status = 'used' THEN
    SELECT scanned_at INTO v_existing_ci
    FROM public.check_ins WHERE ticket_id = p_ticket_id;
    RETURN json_build_object(
      'status', 'already_used',
      'attendeeName', v_ticket.display_name,
      'ticketType', v_ticket.ticket_type_name,
      'checkedInAt', v_existing_ci.scanned_at
    );
  END IF;

  PERFORM id FROM public.tickets WHERE id = p_ticket_id FOR UPDATE;
  SELECT status INTO v_ticket.status FROM public.tickets WHERE id = p_ticket_id;

  IF v_ticket.status = 'used' THEN
    SELECT scanned_at INTO v_existing_ci
    FROM public.check_ins WHERE ticket_id = p_ticket_id;
    RETURN json_build_object(
      'status', 'already_used',
      'attendeeName', v_ticket.display_name,
      'ticketType', v_ticket.ticket_type_name,
      'checkedInAt', v_existing_ci.scanned_at
    );
  END IF;

  UPDATE public.tickets SET status = 'used' WHERE id = p_ticket_id;
  INSERT INTO public.check_ins (ticket_id, scanned_by) VALUES (p_ticket_id, p_staff_id);

  RETURN json_build_object(
    'status', 'valid',
    'attendeeName', v_ticket.display_name,
    'ticketType', v_ticket.ticket_type_name
  );
END;
$$;
