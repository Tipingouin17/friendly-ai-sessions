-- Fix Realtime RLS policies to allow anonymous participants to subscribe
-- Date: 2025-12-08

-- 1. Conversations
-- Allow public access for SELECT to support anonymous joins
CREATE POLICY "Public can view conversations"
ON public.conversations
FOR SELECT
TO public
USING (true);

-- 2. Session Participants
-- Allow public access for SELECT to see who is in the room
CREATE POLICY "Public can view session participants"
ON public.session_participants
FOR SELECT
TO public
USING (true);

-- 3. Messages
-- Allow public access for SELECT to receive chat messages
CREATE POLICY "Public can view messages"
ON public.messages
FOR SELECT
TO public
USING (true);

-- 4. Session Events
-- Allow public access for SELECT to receive session updates (join/leave)
CREATE POLICY "Public can view session events"
ON public.session_events
FOR SELECT
TO public
USING (true);
