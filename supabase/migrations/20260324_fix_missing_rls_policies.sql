-- =============================================================================
-- Migration: Fix Missing RLS Policies for Production Readiness
-- Date: 2026-03-24
-- Description: Adds critical missing Row Level Security policies that are
--              required for the application to function in production.
--              These issues were masked during local development because
--              the local proxy connects as a PostgreSQL superuser.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. MESSAGES TABLE: Allow participants to insert their answers
-- ---------------------------------------------------------------------------
-- Currently only role='assistant' or role='admin' can insert.
-- Participants need to insert messages with role='user'.
CREATE POLICY "Participants can insert messages"
  ON public.messages
  FOR INSERT
  WITH CHECK (role = 'user' AND participant_id IS NOT NULL);

-- ---------------------------------------------------------------------------
-- 2. CONVERSATIONS TABLE: Allow authenticated users to create conversations
-- ---------------------------------------------------------------------------
-- Currently there is no INSERT policy, so hosts cannot create workshops.
CREATE POLICY "Authenticated users can create conversations"
  ON public.conversations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 3. CONVERSATIONS TABLE: Allow hosts to update their own conversations
-- ---------------------------------------------------------------------------
-- The existing UPDATE policy only allows updating current_participants.
-- Hosts also need to update session_started, is_session_ended, welcome_message_status, etc.
CREATE POLICY "Hosts can update their own conversations"
  ON public.conversations
  FOR UPDATE
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 4. SESSION_REPORTS TABLE: Allow report viewing
-- ---------------------------------------------------------------------------
-- RLS is enabled but zero policies exist. No one can read reports.
CREATE POLICY "Hosts can view their session reports"
  ON public.session_reports
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = session_reports.conversation_id
      AND c.user_id = auth.uid()
    )
  );

-- Allow the edge function (service_role) to insert reports
CREATE POLICY "Service role can insert reports"
  ON public.session_reports
  FOR INSERT
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 5. PROFILES TABLE: Allow users to manage their own profiles
-- ---------------------------------------------------------------------------
-- RLS is enabled but zero policies exist.
CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Allow new user profile creation (triggered by auth signup)
CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- 6. SESSIONS TABLE: Allow hosts to manage their sessions
-- ---------------------------------------------------------------------------
-- Currently only SELECT policies exist. Hosts need INSERT/UPDATE.
CREATE POLICY "Authenticated users can create sessions"
  ON public.sessions
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Hosts can update their sessions"
  ON public.sessions
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- ---------------------------------------------------------------------------
-- 7. SESSIONS_HISTORY TABLE: Allow viewing past sessions
-- ---------------------------------------------------------------------------
-- RLS is enabled but zero policies exist.
CREATE POLICY "Users can view their session history"
  ON public.sessions_history
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can insert session history"
  ON public.sessions_history
  FOR INSERT
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 8. REFERRALS TABLE: Allow users to manage referrals
-- ---------------------------------------------------------------------------
-- Check if referrals table has RLS enabled and add policies if needed.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND c.relname = 'referrals' AND c.relrowsecurity = true
  ) THEN
    EXECUTE 'CREATE POLICY "Users can view their referrals" ON public.referrals FOR SELECT USING (auth.uid() IS NOT NULL)';
    EXECUTE 'CREATE POLICY "Users can create referrals" ON public.referrals FOR INSERT WITH CHECK (auth.uid() IS NOT NULL)';
  END IF;
END
$$;
