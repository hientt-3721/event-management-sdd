-- 001_profiles.sql
-- Creates user_role enum, profiles table, trigger, and RLS policies

CREATE TYPE user_role AS ENUM ('attendee', 'organizer', 'staff');

CREATE TABLE public.profiles (
  id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text       NOT NULL DEFAULT '',
  avatar_url  text,
  role        user_role   NOT NULL DEFAULT 'attendee',
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- Auto-create profile when a new auth user signs in via Google
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
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- NOTE: "Organizers can read all profiles" was removed — it caused
-- infinite recursion because the policy queried the profiles table itself.

CREATE POLICY "Users can update own display_name and avatar_url"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
