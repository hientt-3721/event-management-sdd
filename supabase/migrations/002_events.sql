-- 002_events.sql
-- Creates event_status enum, events table, indexes, updated_at trigger, and RLS

CREATE TYPE event_status AS ENUM ('draft', 'published', 'cancelled');

CREATE TABLE public.events (
  id               uuid        NOT NULL DEFAULT gen_random_uuid(),
  organizer_id     uuid        NOT NULL REFERENCES public.profiles(id),
  name             text        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  description      text        NOT NULL CHECK (char_length(description) BETWEEN 1 AND 5000),
  start_at         timestamptz NOT NULL,
  end_at           timestamptz NOT NULL,
  location         text        NOT NULL CHECK (char_length(location) BETWEEN 1 AND 500),
  banner_image_url text,
  status           event_status NOT NULL DEFAULT 'draft',
  created_at       timestamptz  NOT NULL DEFAULT now(),
  updated_at       timestamptz  NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT end_after_start CHECK (end_at > start_at)
);

CREATE INDEX idx_events_status_start ON public.events (status, start_at);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- RLS
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
