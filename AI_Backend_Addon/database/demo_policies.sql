-- Run in Supabase SQL Editor if students cannot see events
-- or cannot write ai_meter_history rows.

-- Table privileges (RLS alone is not enough without GRANT)
GRANT SELECT ON public.campus_events TO authenticated;
GRANT SELECT, INSERT ON public.ai_meter_history TO authenticated;

-- Allow any signed-in user to read campus events (student Home feed)
DROP POLICY IF EXISTS "Authenticated users can read campus events" ON public.campus_events;
CREATE POLICY "Authenticated users can read campus events"
  ON public.campus_events
  FOR SELECT
  TO authenticated
  USING (true);

-- Ensure users can insert/read their own AI meter history
DROP POLICY IF EXISTS "Users can view their own AI history" ON public.ai_meter_history;
DROP POLICY IF EXISTS "Users can insert their own AI history" ON public.ai_meter_history;

CREATE POLICY "Users can view their own AI history"
  ON public.ai_meter_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own AI history"
  ON public.ai_meter_history
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
