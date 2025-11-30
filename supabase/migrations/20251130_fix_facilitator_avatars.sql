-- Migration: Fix Facilitator Avatar Storage
-- Date: 2025-11-30
-- Purpose: Standardize profile_picture to store only filenames

-- Step 1: Clean existing data - extract just the filename from any path or URL
UPDATE facilitators
SET profile_picture = CASE
  -- If it's a full Supabase URL, extract the filename
  WHEN profile_picture LIKE '%supabase.co/storage/v1/object/public/facilitator-avatars/%' THEN
    REGEXP_REPLACE(profile_picture, '^.*/([^/]+)$', '\1')
  -- If it's a path with slashes, extract the filename
  WHEN profile_picture LIKE '%/%' THEN
    REGEXP_REPLACE(profile_picture, '^.*/([^/]+)$', '\1')
  -- If it already looks like a filename, keep it
  ELSE
    profile_picture
END
WHERE profile_picture IS NOT NULL;

-- Step 2: Verify the changes
DO $$
DECLARE
  invalid_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM facilitators
  WHERE profile_picture IS NOT NULL 
    AND (profile_picture LIKE '%/%' OR profile_picture LIKE 'http%');
  
  IF invalid_count > 0 THEN
    RAISE NOTICE 'Warning: % facilitators still have paths/URLs in profile_picture', invalid_count;
  ELSE
    RAISE NOTICE 'Success: All profile_picture values are now filenames only';
  END IF;
END $$;

-- Step 3: Add constraint to prevent future issues (optional - uncomment when ready)
-- ALTER TABLE facilitators 
--   DROP CONSTRAINT IF EXISTS profile_picture_no_path;
-- 
-- ALTER TABLE facilitators 
--   ADD CONSTRAINT profile_picture_no_path 
--   CHECK (profile_picture IS NULL OR (profile_picture !~ '^/' AND profile_picture !~ '^http'));

-- Step 4: Display results for verification
SELECT 
  id, 
  title, 
  profile_picture,
  CASE 
    WHEN profile_picture IS NULL THEN 'No avatar'
    WHEN profile_picture ~ '^/' OR profile_picture ~ '^http' THEN '⚠️ Still has path/URL'
    ELSE '✅ Filename only'
  END as status
FROM facilitators
ORDER BY id;
