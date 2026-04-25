/**
 * useUserPlan
 *
 * Hook for the AIfacilitator application.
 *
 * Performance strategy:
 *  - Plans and plan_restrictions are static product data that never change at
 *    runtime (a code deploy is always required to change pricing/features).
 *  - We therefore use compile-time constants (STATIC_PLANS / STATIC_RESTRICTIONS)
 *    instead of hitting the Railway API for these tables.
 *  - The only live DB call is a single SELECT on `profiles` to get the user's
 *    current_plan_id, reducing 3–4 sequential API calls to exactly 1.
 */

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Plan } from "@/pages/pricing/types";

export interface PlanRestrictions {
  facilitator_limit: number | null;
  session_limit: number | null;
  max_participants: number | null;
  question_limit: number | null;
  customisable_sessions: boolean | null;
  customisable_facilitators: boolean | null;
  saved_sessions: boolean | null;
  session_reports: boolean | null;
  data_export: boolean | null;
  priority_support: boolean | null;
  custom_branding: boolean | null;
}

export interface UserPlanDetails {
  currentPlanId: number | null;
  plan: Plan | null;
  planRestrictions: PlanRestrictions | null;
  isLoading: boolean;
  error: Error | null;
}

// ─── Static plan catalogue (sourced from DB 2026-04-19, AppSumo added 2026-04-25) ───
// Update these constants whenever plan pricing or features change.
// AppSumo LTD plans use IDs 101 (Solo), 102 (Team), 103 (Agency).
// These are lifetime deals — no Stripe billing, no stripe_plan_id.

const STATIC_PLANS: Record<number, Plan> = {
  1: {
    id: 1,
    title: 'Free',
    price: 0,
    plan_type: 'Free',
    is_popular: false,
    stripe_plan_id: 'price_1QxBGlK0lFUZlqguRfa3dJv7',
    currency: 'EUR',
  },
  2: {
    id: 2,
    title: 'Starter',
    price: 19,
    plan_type: 'Starter',
    is_popular: true,
    stripe_plan_id: 'price_1TKRfDK0lFUZlqgubygFSBT8',
    currency: 'EUR',
  },
  3: {
    id: 3,
    title: 'Premium',
    price: 49,
    plan_type: 'Premium',
    is_popular: false,
    stripe_plan_id: 'price_1QxBGUK0lFUZlqgulni2MFIu',
    currency: 'EUR',
  },
  4: {
    id: 4,
    title: 'Enterprise',
    price: 99,
    plan_type: 'Enterprise Plan',
    is_popular: false,
    stripe_plan_id: 'price_1THQALK0lFUZlqguAOCVg4ja',
    currency: 'EUR',
  },
  // ── AppSumo Lifetime Deal plans ──────────────────────────────────────────
  101: {
    id: 101,
    title: 'AppSumo Solo',
    price: 49,
    plan_type: 'appsumo_ltd1',
    is_popular: false,
    stripe_plan_id: null,
    currency: 'EUR',
  },
  102: {
    id: 102,
    title: 'AppSumo Team',
    price: 99,
    plan_type: 'appsumo_ltd2',
    is_popular: true,
    stripe_plan_id: null,
    currency: 'EUR',
  },
  103: {
    id: 103,
    title: 'AppSumo Agency',
    price: 199,
    plan_type: 'appsumo_ltd3',
    is_popular: false,
    stripe_plan_id: null,
    currency: 'EUR',
  },
};

const STATIC_RESTRICTIONS: Record<number, PlanRestrictions> = {
  1: {
    facilitator_limit: 2,
    session_limit: 5,
    max_participants: 10,
    question_limit: 10,
    customisable_sessions: false,
    customisable_facilitators: false,
    saved_sessions: false,
    session_reports: false,
    data_export: false,
    priority_support: false,
    custom_branding: false,
  },
  2: {
    facilitator_limit: 10,
    session_limit: 50,
    max_participants: 50,
    question_limit: 50,
    customisable_sessions: true,
    customisable_facilitators: true,
    saved_sessions: true,
    session_reports: true,
    data_export: true,
    priority_support: false,
    custom_branding: false,
  },
  3: {
    facilitator_limit: null,
    session_limit: null,
    max_participants: null,
    question_limit: null,
    customisable_sessions: true,
    customisable_facilitators: true,
    saved_sessions: true,
    session_reports: true,
    data_export: true,
    priority_support: true,
    custom_branding: true,
  },
  4: {
    facilitator_limit: null,
    session_limit: null,
    max_participants: null,
    question_limit: null,
    customisable_sessions: true,
    customisable_facilitators: true,
    saved_sessions: true,
    session_reports: true,
    data_export: true,
    priority_support: true,
    custom_branding: true,
  },
  // ── AppSumo Lifetime Deal restrictions ───────────────────────────────────
  // Tier 1 (Solo):   1 facilitator, 10 sessions/month, 10 participants
  // Tier 2 (Team):   5 facilitators, 30 sessions/month, 30 participants, data export
  // Tier 3 (Agency): unlimited everything, 100 participants, custom branding
  101: {
    facilitator_limit: 1,
    session_limit: 10,
    max_participants: 10,
    question_limit: 50,
    customisable_sessions: true,
    customisable_facilitators: false,
    saved_sessions: true,
    session_reports: true,
    data_export: false,
    priority_support: false,
    custom_branding: false,
  },
  102: {
    facilitator_limit: 5,
    session_limit: 30,
    max_participants: 30,
    question_limit: 100,
    customisable_sessions: true,
    customisable_facilitators: true,
    saved_sessions: true,
    session_reports: true,
    data_export: true,
    priority_support: false,
    custom_branding: false,
  },
  103: {
    facilitator_limit: null,
    session_limit: null,
    max_participants: 100,
    question_limit: null,
    customisable_sessions: true,
    customisable_facilitators: true,
    saved_sessions: true,
    session_reports: true,
    data_export: true,
    priority_support: false,
    custom_branding: true,
  },
};

// Free plan ID — used as the default when a user has no plan assigned
const FREE_PLAN_ID = 1;

// Default restrictions for Free plan — used as fallback if profile lookup fails
const DEFAULT_FREE_RESTRICTIONS: PlanRestrictions = STATIC_RESTRICTIONS[FREE_PLAN_ID];

export const useUserPlan = (): UserPlanDetails => {
  const { user } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ['userPlan', user?.id],
    queryFn: async () => {
      if (!user) throw new Error("User not authenticated");

      try {
        // Single DB call: get the user's current_plan_id from their profile.
        // Plans and restrictions are resolved from static constants — no extra API calls.
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('current_plan_id')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError) {
          console.warn("useUserPlan: profiles query failed, using Free defaults", profileError);
          return {
            currentPlanId: FREE_PLAN_ID,
            plan: STATIC_PLANS[FREE_PLAN_ID],
            planRestrictions: DEFAULT_FREE_RESTRICTIONS,
          };
        }

        // Resolve plan ID — fall back to Free if not set
        const planId: number =
          (profileData as Record<string, unknown> | null)?.current_plan_id as number | null
          ?? FREE_PLAN_ID;

        // Look up plan and restrictions from static catalogue
        const plan = STATIC_PLANS[planId] ?? STATIC_PLANS[FREE_PLAN_ID];
        const planRestrictions = STATIC_RESTRICTIONS[planId] ?? DEFAULT_FREE_RESTRICTIONS;

        return { currentPlanId: planId, plan, planRestrictions };
      } catch (err) {
        // Last-resort catch: never let the page crash — always return usable defaults
        console.error("useUserPlan: unexpected error, using Free defaults", err);
        return {
          currentPlanId: FREE_PLAN_ID,
          plan: STATIC_PLANS[FREE_PLAN_ID],
          planRestrictions: DEFAULT_FREE_RESTRICTIONS,
        };
      }
    },
    enabled: !!user,
    retry: 1,
    // Cache for 5 minutes — plan rarely changes mid-session
    staleTime: 5 * 60 * 1000,
  });

  return {
    currentPlanId: data?.currentPlanId ?? null,
    plan: data?.plan ?? null,
    planRestrictions: data?.planRestrictions ?? (isLoading ? null : DEFAULT_FREE_RESTRICTIONS),
    isLoading,
    error: error as Error || null,
  };
};
