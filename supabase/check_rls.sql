
-- Check RLS policies for realtime tables
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual, 
    with_check 
FROM pg_policies 
WHERE tablename IN ('messages', 'session_participants', 'conversations');

-- Check if realtime is enabled for these tables
SELECT table_name, publication_name 
FROM pg_publication_tables 
WHERE table_name IN ('messages', 'session_participants', 'conversations');
