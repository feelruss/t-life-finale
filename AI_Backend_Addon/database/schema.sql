-- ========================================================
-- TAYLOR'S APP SUPABASE SCHEMA
-- Run these commands in the Supabase SQL Editor
-- ========================================================

-- 1. Create the AI History table to store Focus/Balance metrics
CREATE TABLE public.ai_meter_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    mode VARCHAR(50) NOT NULL,
    focus_score INTEGER NOT NULL,
    balance_score INTEGER NOT NULL,
    ai_recommendation TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Student Profiles table to link with Google Auth
CREATE TABLE public.student_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    email TEXT UNIQUE NOT NULL,
    programme TEXT,
    total_points INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Set up Row Level Security (RLS) to ensure data privacy
ALTER TABLE public.ai_meter_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies so users can only see their own data
CREATE POLICY "Users can view their own AI history" 
    ON public.ai_meter_history FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own AI history" 
    ON public.ai_meter_history FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own profile" 
    ON public.student_profiles FOR SELECT 
    USING (auth.uid() = id);

-- 5. Trigger to automatically create a student_profile when a new user signs in with Google
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.student_profiles (id, full_name, email)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
