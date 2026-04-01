
import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { StandardPlanCard } from './pricing/components/StandardPlanCard';
import { EnterprisePlanCard } from './pricing/components/EnterprisePlanCard';
import { ComparisonTable } from './pricing/components/ComparisonTable';
import { LoadingState } from './pricing/components/LoadingState';
import { ErrorState } from './pricing/components/ErrorState';
import { useToast } from '@/components/ui/use-toast';
import { Plan } from './pricing/types';
import { useUserPlan } from '@/hooks/useUserPlan';
import { Link, useNavigate } from 'react-router-dom';
import { UpgradePrompt } from '@/components/subscription/UpgradePrompt';
import { Quote } from 'lucide-react';
import PageHead from '@/components/PageHead';

/**
 * Pricing page — prices are fetched LIVE from Stripe via the proxy.
 * Any price change made in the Stripe Dashboard is reflected here
 * automatically on the next page load (no code or DB changes needed).
 *
 * The proxy's get-stripe-prices endpoint:
 *   1. Calls Stripe API for the latest active prices
 *   2. Joins with the local plans table for metadata (title, plan_type, etc.)
 *   3. Auto-syncs the DB price column if Stripe has a different value
 *   4. Falls back to DB prices if Stripe API is unreachable
 */
const Pricing = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { currentPlanId, isLoading: isUserPlanLoading } = useUserPlan();

  // Step 1: Fetch live prices from Stripe via the proxy
  const {
    data: stripePrices,
    isLoading: isStripePricesLoading,
    error: stripePricesError,
  } = useQuery({
    queryKey: ['stripe-live-prices'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-stripe-prices', {
        body: {}
      });
      if (error) throw error;
      return data?.prices as Array<{
        id: string;
        plan_db_id: number;
        unit_amount: number;
        unit_amount_cents: number;
        currency: string;
        recurring: { interval: string } | null;
        title: string;
        plan_type: string;
      }>;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes — Stripe prices don't change every second
    retry: 2,
    retryDelay: 1000,
  });

  // Step 2: Fetch plan metadata (restrictions, is_popular, etc.) from DB
  const {
    data: planMeta,
    isLoading: isPlanMetaLoading,
    error: planMetaError,
  } = useQuery({
    queryKey: ['plan-meta'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plans')
        .select('*, plan_restrictions(*)')
        .order('id', { ascending: true });
      if (error) throw error;
      return data;
    },
    retry: 2,
    retryDelay: 1000,
  });

  // Merge live Stripe prices with DB metadata
  const plans: Plan[] | undefined = React.useMemo(() => {
    if (!stripePrices || !planMeta) return undefined;

    // Build a map of plan_db_id -> DB metadata
    const metaMap = new Map(planMeta.map(m => [m.id, m]));

    return stripePrices
      .map(sp => {
        const meta = metaMap.get(sp.plan_db_id);
        if (!meta) return null;
        const restrictions = meta.plan_restrictions?.[0] || {};
        return {
          id: sp.plan_db_id,
          title: sp.title,
          // Use the LIVE Stripe price — this is the source of truth
          price: sp.unit_amount,
          plan_type: sp.plan_type,
          plan_table_details: restrictions,
          is_popular: meta.is_popular,
          stripe_plan_id: sp.id,
          currency: sp.currency.toUpperCase(),
        } as Plan;
      })
      .filter(Boolean) as Plan[];
  }, [stripePrices, planMeta]);

  const isLoading = isStripePricesLoading || isPlanMetaLoading || isUserPlanLoading;
  const error = stripePricesError || planMetaError;

  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: "Failed to load pricing plans. Please try again later.",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  if (isLoading) {
    return <LoadingState />;
  }

  if (error || !plans) {
    return <ErrorState error={error as Error} />;
  }

  // Separate standard plans (Free, Starter, Premium) from Enterprise
  const standardPlans = plans.filter(plan => plan.title !== 'Enterprise');
  const enterprisePlan = plans.find(plan => plan.title === 'Enterprise');

  return (
    <div className="min-h-screen bg-white pt-24 pb-16">
      <PageHead title="Pricing | MyFacilitator" description="Choose the right plan for your AI-powered workshop facilitation needs." />
      {/* Hero */}
      <div className="bg-gradient-to-b from-indigo-50 to-white pb-12 px-4">
        <div className="container mx-auto">
          <div className="text-center max-w-3xl mx-auto pt-8">
            <span className="inline-flex items-center gap-2 mb-4 px-4 py-1.5 rounded-full bg-indigo-100 text-indigo-700 text-sm font-semibold border border-indigo-200">
              Simple, transparent pricing
            </span>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">Choose the right plan for your team</h1>
            <p className="text-lg text-gray-500">
              Start free, scale as you grow. No hidden fees, cancel anytime.
            </p>
          </div>
        </div>
      </div>
      <div className="container mx-auto px-4">

        {/* Only show limited time offer for Free and Starter plans */}
        {currentPlanId && currentPlanId < 3 && (
          <div className="max-w-4xl mx-auto mb-12">
            <UpgradePrompt
              variant="banner"
              title="Limited Time Offer"
              description="Get 20% off your first 3 months of Premium with code WELCOME20"
              className="shadow-lg"
            />
          </div>
        )}

        {/* Standard plan cards: Free, Starter, Premium */}
        <div className="grid md:grid-cols-3 gap-8 mb-8">
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
          <div className="max-w-4xl mx-auto mb-16">
            <EnterprisePlanCard
              onContactClick={() => navigate('/contact')}
            />
          </div>
        )}

        {/* Testimonials */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-center mb-8">Trusted by Facilitators Worldwide</h2>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <Quote className="h-8 w-8 text-blue-200 mb-4" />
              <p className="text-gray-700 mb-4 italic">"This tool has completely transformed how I run my workshops. The AI insights are incredibly valuable."</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">SJ</div>
                <div>
                  <p className="font-semibold text-sm">Sarah Jenkins</p>
                  <p className="text-xs text-gray-500">Senior Facilitator</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <Quote className="h-8 w-8 text-purple-200 mb-4" />
              <p className="text-gray-700 mb-4 italic">"The premium features are worth every penny. Being able to export detailed reports saves me hours of work."</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold">MR</div>
                <div>
                  <p className="font-semibold text-sm">Mike Ross</p>
                  <p className="text-xs text-gray-500">Agile Coach</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Full comparison table — shows all plans including Enterprise */}
        {plans.length > 0 && <ComparisonTable plans={plans} />}
      </div>
    </div>
  );
};

export default Pricing;
