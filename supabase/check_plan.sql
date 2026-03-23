-- Check user plan and restrictions
SELECT 
    au.email,
    p.current_plan_id,
    pl.title as plan_title,
    pr.session_limit,
    pr.facilitator_limit
FROM auth.users au
JOIN public.profiles p ON au.id = p.id
LEFT JOIN public.plans pl ON p.current_plan_id = pl.id
LEFT JOIN public.plan_restrictions pr ON pl.id = pr.plan_id
WHERE au.email = 'john.doe1764521269@gmail.com';

-- Also check what plan ID 1 corresponds to (default fallback)
SELECT * FROM public.plans WHERE id = 1;
SELECT * FROM public.plan_restrictions WHERE plan_id = 1;
