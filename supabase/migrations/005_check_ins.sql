-- 005_check_ins.sql
-- Creates check_ins table with unique constraint and RLS

CREATE TABLE public.check_ins (
  id          uuid        NOT NULL DEFAULT gen_random_uuid(),
  ticket_id   uuid        NOT NULL UNIQUE REFERENCES public.tickets(id),
  scanned_at  timestamptz NOT NULL DEFAULT now(),
  scanned_by  uuid        REFERENCES public.profiles(id),
  PRIMARY KEY (id)
);

-- RLS
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers and staff can read check-ins for their events"
  ON public.check_ins FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tickets t
      JOIN public.ticket_types tt ON tt.id = t.ticket_type_id
      JOIN public.events e ON e.id = tt.event_id
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE t.id = ticket_id
        AND e.organizer_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('organizer', 'staff')
    )
  );

-- INSERT only via validate_and_check_in RPC (SECURITY DEFINER)
