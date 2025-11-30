-- Fix facilitator profile_picture URLs by removing leading slashes
-- This prevents double slashes when Supabase storage URLs are generated

UPDATE facilitators
SET profile_picture = CASE
  -- If the profile_picture starts with a slash and contains 'facilitator-avatars'
  WHEN profile_picture LIKE '/%' AND profile_picture LIKE '%facilitator-avatars%' THEN
    -- Extract just the filename (e.g., '/52.jpg' becomes '52.jpg')
    REGEXP_REPLACE(profile_picture, '^.*/([^/]+)$', '\1')
  -- If it's already a full URL, leave it as is
  WHEN profile_picture LIKE 'http%' THEN
    profile_picture
  -- Otherwise, remove any leading slash
  WHEN profile_picture LIKE '/%' THEN
    LTRIM(profile_picture, '/')
  ELSE
    profile_picture
END
WHERE profile_picture IS NOT NULL;

-- Verify the changes
SELECT id, title, profile_picture 
FROM facilitators 
ORDER BY id;
