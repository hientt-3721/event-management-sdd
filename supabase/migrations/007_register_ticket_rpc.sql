-- 007_register_ticket_rpc.sql
-- Atomic ticket reservation preventing overbooking and duplicate registration

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
  -- Get event details via ticket type
  SELECT e.id, e.status, tt.total_quantity, e.start_at
  INTO v_event_id, v_event_status, v_total_quantity, v_event_start_at
  FROM public.ticket_types tt
  JOIN public.events e ON e.id = tt.event_id
  WHERE tt.id = p_ticket_type_id
  FOR UPDATE OF tt;  -- lock the ticket_types row

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND: ticket type does not exist';
  END IF;

  IF v_event_status != 'published' THEN
    RAISE EXCEPTION 'EVENT_NOT_PUBLISHED: event is not accepting registrations';
  END IF;

  -- Check for duplicate registration across any ticket type in this event
  IF EXISTS (
    SELECT 1 FROM public.tickets t
    JOIN public.ticket_types tt ON tt.id = t.ticket_type_id
    WHERE tt.event_id = v_event_id
      AND t.attendee_id = p_attendee_id
      AND t.status != 'cancelled'
  ) THEN
    RAISE EXCEPTION 'ALREADY_REGISTERED: attendee already has a ticket for this event';
  END IF;

  -- Count currently issued tickets for this type
  SELECT COUNT(*) INTO v_issued_count
  FROM public.tickets
  WHERE ticket_type_id = p_ticket_type_id AND status != 'cancelled';

  IF v_issued_count >= v_total_quantity THEN
    RAISE EXCEPTION 'SOLD_OUT: no tickets remaining for this ticket type';
  END IF;

  -- Insert ticket
  INSERT INTO public.tickets (attendee_id, ticket_type_id)
  VALUES (p_attendee_id, p_ticket_type_id)
  RETURNING id INTO v_ticket_id;

  -- Schedule reminder notifications (24h and 1h before event start)
  INSERT INTO public.notifications (attendee_id, event_id, ticket_id, type, scheduled_at)
  VALUES
    (p_attendee_id, v_event_id, v_ticket_id, 'reminder_24h', v_event_start_at - INTERVAL '24 hours'),
    (p_attendee_id, v_event_id, v_ticket_id, 'reminder_1h',  v_event_start_at - INTERVAL '1 hour')
  ON CONFLICT (attendee_id, event_id, type) DO NOTHING;

  RETURN v_ticket_id;
END;
$$;
