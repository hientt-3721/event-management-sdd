-- 008_validate_check_in_rpc.sql
-- Validate QR ticket and record check-in atomically

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
  v_ticket        record;
  v_existing_ci   record;
  v_attendee_name text;
  v_ticket_type   text;
BEGIN
  -- Fetch ticket with attendee and ticket type info
  SELECT
    t.id,
    t.status,
    p.display_name,
    tt.name AS ticket_type_name
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

  -- Lock row and re-verify status (guard against concurrent scan)
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

  -- Mark ticket as used and record check-in
  UPDATE public.tickets SET status = 'used' WHERE id = p_ticket_id;

  INSERT INTO public.check_ins (ticket_id, scanned_by)
  VALUES (p_ticket_id, p_staff_id);

  RETURN json_build_object(
    'status', 'valid',
    'attendeeName', v_ticket.display_name,
    'ticketType', v_ticket.ticket_type_name
  );
END;
$$;
