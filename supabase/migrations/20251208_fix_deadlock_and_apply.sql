-- Forcefully release locks by terminating connections to target tables
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT distinct pid 
        FROM pg_locks l
        JOIN pg_class t ON l.relation = t.oid
        JOIN pg_namespace nsp ON t.relnamespace = nsp.oid
        WHERE nsp.nspname = 'public'
          AND t.relname IN ('conversations', 'session_participants', 'messages', 'session_events')
          AND pid <> pg_backend_pid()
    LOOP
        PERFORM pg_terminate_backend(r.pid);
    END LOOP;
END $$;

-- Now apply the policies safely
-- 1. Conversations
DROP POLICY IF EXISTS "Public can view conversations" ON public.conversations;
CREATE POLICY "Public can view conversations" ON public.conversations FOR SELECT TO public USING (true);

-- 2. Session Participants
DROP POLICY IF EXISTS "Public can view session participants" ON public.session_participants;
CREATE POLICY "Public can view session participants" ON public.session_participants FOR SELECT TO public USING (true);

-- 3. Messages
DROP POLICY IF EXISTS "Public can view messages" ON public.messages;
CREATE POLICY "Public can view messages" ON public.messages FOR SELECT TO public USING (true);

-- 4. Session Events
DROP POLICY IF EXISTS "Public can view session events" ON public.session_events;
CREATE POLICY "Public can view session events" ON public.session_events FOR SELECT TO public USING (true);
