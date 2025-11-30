-- Verify admin access was granted
SELECT 
    p.id,
    au.email,
    p.role,
    p.current_plan_id,
    p.created_at
FROM public.profiles p
JOIN auth.users au ON p.id = au.id
WHERE au.email = 'john.doe1764521269@gmail.com';

-- Expected result: role should be 'admin'
