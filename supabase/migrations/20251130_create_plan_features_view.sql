-- Drop the view first to avoid "cannot drop columns from view" errors if schema changes
DROP VIEW IF EXISTS public.plan_features;

-- Create plan_features view for Checkout component
CREATE OR REPLACE VIEW public.plan_features AS
SELECT
  p.id,
  p.title,
  p.price,
  p.plan_type,
  p.is_popular,
  p.stripe_plan_id,
  p.currency,
  pr.facilitator_limit as no_of_facilitator,
  pr.session_limit as no_of_sessions,
  pr.max_participants,
  pr.customisable_sessions,
  pr.customisable_facilitators,
  pr.saved_sessions,
  pr.session_reports,
  pr.data_export
FROM public.plans p
LEFT JOIN public.plan_restrictions pr ON p.id = pr.plan_id;

-- Grant access to authenticated users (and anon if needed for public checkout)
GRANT SELECT ON public.plan_features TO authenticated;
GRANT SELECT ON public.plan_features TO anon;
