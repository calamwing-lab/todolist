-- UPDATED SUPABASE SCHEMA
-- Copy and run this script in your Supabase SQL Editor (https://supabase.com/dashboard)
-- This will set up the tables, policies, and test accounts.

-- 1. DROP EXISTING TRIGGER & FUNCTIONS (if any)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;

DROP TABLE IF EXISTS public.main_tasks CASCADE;
DROP TABLE IF EXISTS public.daily_tasks CASCADE;
DROP TABLE IF EXISTS public.videos CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- 2. CREATE USERS TABLE
CREATE TABLE public.users (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  phone text UNIQUE NOT NULL,
  role text CHECK (role IN ('admin', 'student')) DEFAULT 'student' NOT NULL,
  name text,
  batch text,
  skills text[] DEFAULT '{}'::text[] NOT NULL,
  personal_tasks jsonb DEFAULT '[]'::jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. CREATE MAIN_TASKS TABLE
CREATE TABLE public.main_tasks (
  id text PRIMARY KEY,
  label text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. CREATE DAILY_TASKS TABLE
CREATE TABLE public.daily_tasks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  date date DEFAULT CURRENT_DATE NOT NULL,
  task_data jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (user_id, date)
);

-- 5. CREATE VIDEOS TABLE
CREATE TABLE public.videos (
  id text PRIMARY KEY, -- Using text to support 'vid-1' format or random IDs
  url text NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. CREATE HELPER FUNCTIONS
-- Helper function to check if current user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql;

-- 7. CREATE TRIGGER FUNCTION & TRIGGER
-- Trigger to sync auth.users with public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.users (id, phone, role, name, batch, skills, personal_tasks)
  VALUES (
    new.id,
    COALESCE(new.phone, new.raw_user_meta_data->>'phone', ''),
    COALESCE(new.raw_user_meta_data->>'role', 'student'),
    COALESCE(new.raw_user_meta_data->>'name', 'Student'),
    new.raw_user_meta_data->>'batch',
    '{}'::text[],
    '[]'::jsonb
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.main_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- 9. DEFINE RLS POLICIES

-- Policies for public.users
CREATE POLICY "Allow read access to all authenticated users" ON public.users
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow users to update their own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can manage all users" ON public.users
  FOR ALL USING (public.is_admin());

-- Policies for public.main_tasks
CREATE POLICY "Allow read access to main_tasks for authenticated users" ON public.main_tasks
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage main_tasks" ON public.main_tasks
  FOR ALL USING (public.is_admin());

-- Policies for public.daily_tasks
CREATE POLICY "Allow read access to daily_tasks for authenticated users" ON public.daily_tasks
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Students can modify own tasks" ON public.daily_tasks
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all daily_tasks" ON public.daily_tasks
  FOR ALL USING (public.is_admin());

-- Policies for public.videos
CREATE POLICY "All authenticated users can view videos" ON public.videos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage videos" ON public.videos
  FOR ALL USING (public.is_admin());

-- 10. REVOKE DIRECT EXECUTION TO SECURE DEFINER TRIGGERS
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres;

-- 11. SEED TEST ACCOUNTS
-- Note: Make sure to delete any conflicting user IDs if clean slate is needed
-- Admin (Phone: +919876543210, Password: admin123)
INSERT INTO auth.users (
  id,
  aud,
  role,
  phone,
  email,
  email_confirmed_at,
  encrypted_password,
  phone_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_sso_user,
  is_anonymous,
  created_at,
  updated_at
)
VALUES (
  'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
  'authenticated',
  'authenticated',
  '+919876543210',
  '9876543210@tracker.com',
  now(),
  crypt('admin123', gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email", "phone"]}',
  '{"role": "admin", "name": "System Admin", "phone": "+919876543210"}',
  false,
  false,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

-- Student (Phone: +919876543211, Password: student123)
INSERT INTO auth.users (
  id,
  aud,
  role,
  phone,
  email,
  email_confirmed_at,
  encrypted_password,
  phone_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_sso_user,
  is_anonymous,
  created_at,
  updated_at
)
VALUES (
  'e5f6a1b2-c3d4-7a8b-9c0d-1e2f3a4b5c6d',
  'authenticated',
  'authenticated',
  '+919876543211',
  '9876543211@tracker.com',
  now(),
  crypt('student123', gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email", "phone"]}',
  '{"role": "student", "name": "John Doe", "phone": "+919876543211", "batch": "HS1"}',
  false,
  false,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;
