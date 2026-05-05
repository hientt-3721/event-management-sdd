-- 004_tickets.sql
-- Creates ticket_status enum, tickets table, constraints, and RLS

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

-- One active/used ticket per attendee per event (prevent duplicate registration)
CREATE UNIQUE INDEX idx_tickets_unique_attendee_event
  ON public.tickets (attendee_id, ticket_type_id)
  WHERE status != 'cancelled';

-- RLS
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

-- INSERT is blocked from client — only via register_ticket RPC (SECURITY DEFINER)

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

-- Defined here (not in 003) because public.tickets must exist first
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
