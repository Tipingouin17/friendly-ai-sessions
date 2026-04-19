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
import { supabase } from "@/integrations/supabase/client";
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

// Only cache on production builds (VITE_CACHE_PRICING defaults to "true")
const CACHE_ENABLED = import.meta.env.VITE_CACHE_PRICING !== 'false'
  && import.meta.env.MODE !== 'development';

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

// ─── Component ────────────────────────────────────────────────────────────────

const Pricing = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { currentPlanId, isLoading: isUserPlanLoading } = useUserPlan();

  // Seed state from cache so there is zero loading flash on return visits
  const [plans, setPlans] = useState<Plan[] | null>(() => readCache());
  const [fetchError, setFetchError] = useState<Error | null>(null);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsFetching(true);

    supabase
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

  // Separate standard plans (Free, Starter, Premium) from Enterprise
  const standardPlans = safePlans.filter(plan => plan.title !== 'Enterprise');
  const enterprisePlan = safePlans.find(plan => plan.title === 'Enterprise');

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

        {/* Only show limited time offer for Free and Starter plans */}
        {currentPlanId && currentPlanId < 3 && (
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

        {/* Full comparison table — shows all plans including Enterprise */}
        {safePlans.length > 0 && <ComparisonTable plans={safePlans} />}
      </div>
    </div>
  );
};

export default Pricing;
