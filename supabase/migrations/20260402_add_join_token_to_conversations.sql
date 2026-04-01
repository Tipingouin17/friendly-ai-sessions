-- =============================================================================
-- Migration: 20260402_add_join_token_to_conversations.sql
-- Purpose:   Add a cryptographically random join_token to conversations.
--            This token is included in participant join URLs so that
--            sequential ID enumeration is no longer sufficient to access
--            a session.  Without the correct token the join-session page
--            will refuse to register the participant.
-- =============================================================================

-- 1. Add the column (nullable first so existing rows are not rejected).
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS join_token UUID;

-- 2. Back-fill existing rows with a random token.
UPDATE public.conversations
  SET join_token = gen_random_uuid()
  WHERE join_token IS NULL;

-- 3. Now enforce NOT NULL and add a unique index.
ALTER TABLE public.conversations
  ALTER COLUMN join_token SET NOT NULL,
  ALTER COLUMN join_token SET DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS conversations_join_token_idx
  ON public.conversations (join_token);
