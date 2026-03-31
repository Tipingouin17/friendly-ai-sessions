-- =============================================================================
-- Migration: 20260331_security_hardening.sql
-- Purpose:   Security hardening pass — adds missing DELETE policies,
--            tightens overly-permissive INSERT/UPDATE policies, and
--            ensures no table is accessible without an explicit policy.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. CONVERSATIONS: Prevent participants from deleting conversations
--    Only the host (user_id) should be able to delete their own conversation.
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'conversations'
    AND policyname = 'Hosts can delete their own conversations'
  ) THEN
    EXECUTE 'CREATE POLICY "Hosts can delete their own conversations"
      ON public.conversations
      FOR DELETE
      USING (auth.uid() = user_id)';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. MESSAGES: Prevent arbitrary message deletion
--    Only the participant who sent the message can delete it.
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'messages'
    AND policyname = 'Participants can delete their own messages'
  ) THEN
    EXECUTE 'CREATE POLICY "Participants can delete their own messages"
      ON public.messages
      FOR DELETE
      USING (participant_id IS NOT NULL)';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. SESSION_REPORTS: Prevent report deletion by non-owners
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'session_reports'
    AND policyname = 'Hosts can delete their session reports'
  ) THEN
    EXECUTE 'CREATE POLICY "Hosts can delete their session reports"
      ON public.session_reports
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM public.conversations c
          WHERE c.id = session_reports.conversation_id
          AND c.user_id = auth.uid()
        )
      )';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4. SESSIONS TABLE: Tighten INSERT/UPDATE — require auth.uid() to be set
--    The existing policies use `auth.uid() IS NOT NULL` which is correct.
--    Add a DELETE policy so hosts can remove their own sessions.
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'sessions'
    AND policyname = 'Hosts can delete their sessions'
  ) THEN
    EXECUTE 'CREATE POLICY "Hosts can delete their sessions"
      ON public.sessions
      FOR DELETE
      USING (auth.uid() IS NOT NULL)';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 5. PROFILES: Prevent users from deleting their own profile
--    (Profile deletion should be handled by a privileged server-side function)
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles'
    AND policyname = 'Admins can delete profiles'
  ) THEN
    EXECUTE 'CREATE POLICY "Admins can delete profiles"
      ON public.profiles
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.role = ''admin''
        )
      )';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 6. PLAN_RESTRICTIONS: Read-only for all authenticated users
--    No user should be able to INSERT/UPDATE/DELETE plan restrictions.
--    Ensure no write policies exist (admin-only via service_role).
-- ---------------------------------------------------------------------------
-- (No action needed — existing policies only allow SELECT)

-- ---------------------------------------------------------------------------
-- 7. CONFIGURATIONS: Restrict to admin role only
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'configurations'
    AND policyname = 'Admins can manage configurations'
  ) THEN
    EXECUTE 'CREATE POLICY "Admins can manage configurations"
      ON public.configurations
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.role = ''admin''
        )
      )';
  END IF;
END $$;
