/**
 * Pricing
 *
 * Page for the AIfacilitator application.
 * Plans are fetched directly from the Railway PostgreSQL database.
 *
 * Caching strategy:
 *  - localStorage key "pricing_plans_cache" stores { data, cachedAt } with a 24-hour TTL.
 *  - On mount, cached data is shown immediately (zero loading flash for returning visitors).
 *  - A background refresh runs on every visit; if fresh data differs it updates the cache
 *    and re-renders seamlessly.
 *  - On dev builds (VITE_CACHE_PRICING=false) the cache is bypassed so changes are visible
 *    immediately during development.
 */

import React, { useEffect, useState } from 'react';
import api from "@/lib/api";
import { StandardPlanCard } from './pricing/components/StandardPlanCard';
import { EnterprisePlanCard } from './pricing/components/EnterprisePlanCard';
import { ComparisonTable } from './pricing/components/ComparisonTable';
import { LoadingState } from './pricing/components/LoadingState';
import { ErrorState } from './pricing/components/ErrorState';
import { useToast } from '@/components/ui/use-toast';
import { Plan } from './pricing/types';
import { useUserPlan } from '@/hooks/useUserPlan';
import { useNavigate } from 'react-router-dom';
import { UpgradePrompt } from '@/components/subscription/UpgradePrompt';
import { Quote } from 'lucide-react';
import PageHead from '@/components/PageHead';

// ─── Cache helpers ────────────────────────────────────────────────────────────

const CACHE_KEY = 'pricing_plans_cache';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Disable cache only when running against localhost (local dev environment).
// Both the Vercel dev-branch preview and the production deployment point to Railway,
// so the cache is active there regardless of the Vite --mode flag.
const CACHE_ENABLED = !String(import.meta.env.VITE_API_URL ?? '').includes('localhost');

interface PlanCache {
  data: Plan[];
  cachedAt: number;
}

function readCache(): Plan[] | null {
  if (!CACHE_ENABLED) return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed: PlanCache = JSON.parse(raw);
    if (Date.now() - parsed.cachedAt > CACHE_TTL_MS) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

function writeCache(data: Plan[]): void {
  if (!CACHE_ENABLED) return;
  try {
    const entry: PlanCache = { data, cachedAt: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // localStorage might be full or unavailable — ignore silently
  }
}

function mapPlans(raw: any[]): Plan[] {
  return raw.map((p: any) => {
    const restrictions = Array.isArray(p.plan_restrictions)
      ? p.plan_restrictions[0] || {}
      : p.plan_restrictions || {};
    return {
      id: p.id,
      title: p.title,
      price: Number(p.price),
      plan_type: p.plan_type,
      plan_table_details: restrictions,
      is_popular: p.is_popular ?? false,
      stripe_plan_id: p.stripe_plan_id,
      currency: (p.currency || 'EUR').toUpperCase(),
    } as Plan;
  });
}

// ─── Static fallback plans (shown instantly; API refreshes in background) ─────
// Sourced from production DB on 2026-04-19. Update if plan pricing changes.
const FALLBACK_PLANS: Plan[] = [
  {
    id: 1,
    title: 'Free',
    price: 0,
    plan_type: 'Free',
    is_popular: false,
    stripe_plan_id: 'price_1QxBGlK0lFUZlqguRfa3dJv7',
    currency: 'EUR',
    plan_table_details: {
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
  },
  {
    id: 2,
    title: 'Starter',
    price: 19,
    plan_type: 'Starter',
    is_popular: true,
    stripe_plan_id: 'price_1TKRfDK0lFUZlqgubygFSBT8',
    currency: 'EUR',
    plan_table_details: {
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
  },
  {
    id: 3,
    title: 'Premium',
    price: 49,
    plan_type: 'Premium',
    is_popular: false,
    stripe_plan_id: 'price_1QxBGUK0lFUZlqgulni2MFIu',
    currency: 'EUR',
    plan_table_details: {
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
  },
  {
    id: 4,
    title: 'Enterprise',
    price: 99,
    plan_type: 'Enterprise Plan',
    is_popular: false,
    stripe_plan_id: 'price_1THQALK0lFUZlqguAOCVg4ja',
    currency: 'EUR',
    plan_table_details: {
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
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

const Pricing = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { currentPlanId, isLoading: isUserPlanLoading } = useUserPlan();

  // Seed state from cache, or use static fallback so there is zero loading flash
  const [plans, setPlans] = useState<Plan[] | null>(() => readCache() ?? FALLBACK_PLANS);
  const [fetchError, setFetchError] = useState<Error | null>(null);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsFetching(true);

    api
      .from('plans')
      .select('*, plan_restrictions(*)')
      .order('id', { ascending: true })
      .then(({ data, error }: { data: any; error: any }) => {
        if (cancelled) return;
        setIsFetching(false);
        if (error) {
          // Only surface the error if we have no cached data to show
          if (!plans) setFetchError(error as Error);
          return;
        }
        if (!data) return;
        const mapped = mapPlans(data);
        setPlans(mapped);
        writeCache(mapped);
      });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (fetchError) {
      toast({
        title: "Error",
        description: "Failed to load pricing plans. Please try again later.",
        variant: "destructive",
      });
    }
  }, [fetchError, toast]);

  // Show skeleton only when we have no data at all (first-ever visit with cold backend)
  const isLoading = (!plans && isFetching) || isUserPlanLoading;

  if (isLoading) {
    return <LoadingState />;
  }

  if (fetchError && !plans) {
    return <ErrorState error={fetchError} />;
  }

  const safePlans = plans ?? [];

  // AppSumo LTD plans (IDs 101-103) are activated via /redeem-appsumo only —
  // they must not appear as purchasable cards on the public pricing page.
  const publicPlans = safePlans.filter(plan => plan.id < 100);

  // Separate standard plans (Free, Starter, Premium) from Enterprise
  const standardPlans = publicPlans.filter(plan => plan.title !== 'Enterprise');
  const enterprisePlan = publicPlans.find(plan => plan.title === 'Enterprise');

  // AppSumo LTD users (plan IDs 101-103) already have a lifetime deal —
  // they should not see the upgrade prompt or be offered standard subscriptions.
  const isAppSumoUser = currentPlanId !== null && currentPlanId >= 100;

  return (
    <div className="min-h-screen bg-white pb-16">
      <PageHead title="Pricing | AIfacilitator" description="Choose the right plan for your AI-powered workshop facilitation needs." />

      {/* Hero */}
      <div className="bg-gradient-to-b from-indigo-50 to-white pb-6 md:pb-12 px-4">
        <div className="container mx-auto">
          <div className="text-center max-w-3xl mx-auto pt-24 md:pt-28">
            <span className="inline-flex items-center gap-2 mb-4 px-4 py-1.5 rounded-full bg-indigo-100 text-indigo-700 text-sm font-semibold border border-indigo-200">
              Simple, transparent pricing
            </span>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-gray-900 text-center">
              Choose the right plan for your team
            </h1>
            <p className="text-base md:text-lg text-gray-500 text-center">
              Start free, scale as you grow. No hidden fees, cancel anytime.
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4">

        {/* Only show limited time offer for Free and Starter plans — never for AppSumo LTD holders */}
        {!isAppSumoUser && currentPlanId !== null && currentPlanId < 3 && (
          <div className="max-w-4xl mx-auto mb-10 md:mb-12">
            <UpgradePrompt
              variant="banner"
              title="Limited Time Offer"
              description="Get 20% off your first 3 months of Premium with code WELCOME20"
              className="shadow-lg"
            />
          </div>
        )}

        {/* Standard plan cards: Free, Starter, Premium */}
        {/* mt-8 provides space for the "Most Popular" badge that floats above the card */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8 mb-8 mt-4 md:mt-8 items-stretch">
          {standardPlans.map((plan, index) => (
            <StandardPlanCard
              key={plan.id}
              plan={plan}
              isCurrentPlan={plan.id === currentPlanId}
              index={index}
            />
          ))}
        </div>

        {/* Enterprise plan card */}
        {enterprisePlan && (
          <div className="max-w-4xl mx-auto mb-12 md:mb-16">
            <EnterprisePlanCard
              onContactClick={() => navigate('/contact')}
            />
          </div>
        )}

        {/* Testimonials */}
        <div className="mb-12 md:mb-16">
          <h2 className="text-2xl font-bold text-center mb-8">Trusted by Facilitators Worldwide</h2>
          <div className="grid sm:grid-cols-2 gap-5 md:gap-6 max-w-4xl mx-auto">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <Quote className="h-8 w-8 text-blue-200 mb-4" />
              <p className="text-gray-700 mb-4 italic text-sm md:text-base">"This tool has completely transformed how I run my workshops. The AI insights are incredibly valuable."</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 flex-shrink-0 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">SJ</div>
                <div>
                  <p className="font-semibold text-sm">Sarah Jenkins</p>
                  <p className="text-xs text-gray-500">Senior Facilitator</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <Quote className="h-8 w-8 text-purple-200 mb-4" />
              <p className="text-gray-700 mb-4 italic text-sm md:text-base">"The premium features are worth every penny. Being able to export detailed reports saves me hours of work."</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 flex-shrink-0 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold text-sm">MR</div>
                <div>
                  <p className="font-semibold text-sm">Mike Ross</p>
                  <p className="text-xs text-gray-500">Agile Coach</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Full comparison table — shows only purchasable plans (excludes AppSumo LTD) */}
        {publicPlans.length > 0 && <ComparisonTable plans={publicPlans} />}
      </div>
    </div>
  );
};

export default Pricing;
