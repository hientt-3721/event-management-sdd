-- 003_ticket_types.sql
-- Creates ticket_types table with quantity guard and RLS

CREATE TABLE public.ticket_types (
  id             uuid        NOT NULL DEFAULT gen_random_uuid(),
  event_id       uuid        NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name           text        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  description    text        CHECK (char_length(description) <= 500),
  total_quantity integer     NOT NULL CHECK (total_quantity > 0),
  created_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- Guard: total_quantity cannot be reduced below issued count
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

CREATE TRIGGER ticket_type_quantity_guard
  BEFORE UPDATE ON public.ticket_types
  FOR EACH ROW
  WHEN (NEW.total_quantity < OLD.total_quantity)
  EXECUTE PROCEDURE public.check_ticket_type_quantity();

-- RLS
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

-- NOTE: "Organizers can delete ticket types with no issued tickets" policy
-- is defined in 004_tickets.sql (after public.tickets is created)
