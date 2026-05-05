-- supabase/seed.sql
-- Development seed data for local testing
-- Run with: supabase db reset (this runs seed.sql after migrations)

-- Note: actual auth.users rows must be inserted through Supabase Auth.
-- The profile IDs below are placeholders; replace with real auth UUIDs
-- after signing in for the first time and promoting via SQL.

-- To use this seed:
-- 1. Sign in with Google OAuth in the app
-- 2. Copy your user UUID from the Supabase Auth > Users table
-- 3. Replace the UUIDs below
-- 4. Run: supabase db reset

DO $$
DECLARE
  organizer_id uuid := '00000000-0000-0000-0000-000000000001';
  attendee_id  uuid := '00000000-0000-0000-0000-000000000002';
  event1_id    uuid := gen_random_uuid();
  event2_id    uuid := gen_random_uuid();
  tt1_id       uuid := gen_random_uuid();
  tt2_id       uuid := gen_random_uuid();
  tt3_id       uuid := gen_random_uuid();
BEGIN

-- Sample organizer profile (replace ID with real auth UUID)
INSERT INTO public.profiles (id, display_name, avatar_url, role)
VALUES (organizer_id, 'Demo Organizer', null, 'organizer')
ON CONFLICT (id) DO UPDATE SET role = 'organizer';

-- Sample attendee profile (replace ID with real auth UUID)
INSERT INTO public.profiles (id, display_name, avatar_url, role)
VALUES (attendee_id, 'Demo Attendee', null, 'attendee')
ON CONFLICT (id) DO NOTHING;

-- Event 1: upcoming published event
INSERT INTO public.events (id, organizer_id, name, description, start_at, end_at, location, status)
VALUES (
  event1_id,
  organizer_id,
  'Tech Conference 2026',
  'Hội thảo công nghệ thường niên. Tham gia để cập nhật xu hướng mới nhất trong ngành!',
  now() + INTERVAL '7 days',
  now() + INTERVAL '7 days' + INTERVAL '8 hours',
  'Trung tâm Hội nghị Quốc gia, Hà Nội',
  'published'
);

-- Ticket types for event 1
INSERT INTO public.ticket_types (id, event_id, name, description, total_quantity)
VALUES
  (tt1_id, event1_id, 'Vé thường', 'Tham dự toàn bộ phiên hội thảo', 200),
  (tt2_id, event1_id, 'Vé VIP', 'Khu VIP, bữa trưa và quà tặng đặc biệt', 30);

-- Event 2: another upcoming published event
INSERT INTO public.events (id, organizer_id, name, description, start_at, end_at, location, status)
VALUES (
  event2_id,
  organizer_id,
  'Workshop: Thiết kế UX nâng cao',
  'Workshop thực hành về thiết kế trải nghiệm người dùng hiện đại với Figma và các công cụ AI.',
  now() + INTERVAL '14 days',
  now() + INTERVAL '14 days' + INTERVAL '6 hours',
  'Coworking Space Hub, TP. Hồ Chí Minh',
  'published'
);

INSERT INTO public.ticket_types (id, event_id, name, description, total_quantity)
VALUES (tt3_id, event2_id, 'Vé tham dự', 'Bao gồm tài liệu và giấy chứng nhận', 50);

END $$;
