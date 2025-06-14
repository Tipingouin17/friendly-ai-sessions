
-- Create session_reports table to store generated reports
CREATE TABLE public.session_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id BIGINT NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  report_content TEXT NOT NULL,
  report_type TEXT NOT NULL DEFAULT 'standard',
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  generated_by UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}'::jsonb,
  file_url TEXT,
  file_size INTEGER
);

-- Add RLS policies for session_reports
ALTER TABLE public.session_reports ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view reports for conversations they own
CREATE POLICY "Users can view their own session reports" 
  ON public.session_reports 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c 
      WHERE c.id = session_reports.conversation_id 
      AND c.user_id = auth.uid()
    )
  );

-- Policy: Users can create reports for conversations they own
CREATE POLICY "Users can create reports for their conversations" 
  ON public.session_reports 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations c 
      WHERE c.id = session_reports.conversation_id 
      AND c.user_id = auth.uid()
    )
  );

-- Add session analytics fields to conversations table
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS total_messages INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS participant_engagement_score NUMERIC(3,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS session_duration_minutes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS final_report_id UUID REFERENCES public.session_reports(id);

-- Create function to update session analytics
CREATE OR REPLACE FUNCTION public.calculate_session_analytics(conv_id BIGINT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  msg_count INTEGER;
  participant_count INTEGER;
  session_start TIMESTAMP WITH TIME ZONE;
  session_end TIMESTAMP WITH TIME ZONE;
  duration_mins INTEGER;
  engagement_score NUMERIC(3,2);
BEGIN
  -- Count total messages
  SELECT COUNT(*) INTO msg_count
  FROM public.messages
  WHERE conversation_id = conv_id;
  
  -- Get participant count
  SELECT COUNT(*) INTO participant_count
  FROM public.session_participants
  WHERE conversation_id = conv_id;
  
  -- Calculate session duration
  SELECT created_at, ended_at INTO session_start, session_end
  FROM public.conversations
  WHERE id = conv_id;
  
  IF session_end IS NOT NULL AND session_start IS NOT NULL THEN
    duration_mins := EXTRACT(EPOCH FROM (session_end - session_start)) / 60;
  ELSE
    duration_mins := 0;
  END IF;
  
  -- Calculate engagement score (messages per participant)
  IF participant_count > 0 THEN
    engagement_score := LEAST(5.0, (msg_count::NUMERIC / participant_count::NUMERIC));
  ELSE
    engagement_score := 0.0;
  END IF;
  
  -- Update the conversation with analytics
  UPDATE public.conversations
  SET 
    total_messages = msg_count,
    participant_engagement_score = engagement_score,
    session_duration_minutes = duration_mins
  WHERE id = conv_id;
END;
$$;
