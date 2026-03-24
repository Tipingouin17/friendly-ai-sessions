
import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { StandardPlanCard } from './pricing/components/StandardPlanCard';
import { ComparisonTable } from './pricing/components/ComparisonTable';
import { LoadingState } from './pricing/components/LoadingState';
import { ErrorState } from './pricing/components/ErrorState';
import { useToast } from '@/components/ui/use-toast';
import { Plan } from './pricing/types';
import { useUserPlan } from '@/hooks/useUserPlan';
import { Link } from 'react-router-dom';
import { UpgradePrompt } from '@/components/subscription/UpgradePrompt';
import { Quote } from 'lucide-react';
import PageHead from '@/components/PageHead';

const Pricing = () => {
  const { toast } = useToast();
  const { currentPlanId, isLoading: isUserPlanLoading } = useUserPlan();

  const { data: plans, isLoading, error } = useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      // Fetch plans with all their restrictions
      const { data, error } = await supabase
        .from('plans')
        .select('*, plan_restrictions(*)')
        .order('id', { ascending: true });

      if (error) {
        console.error('Error fetching plans:', error);
        throw error;
      }

      if (!data) {
        throw new Error('No plans data returned');
      }

      const processedData = data.map(plan => {
        const currency = plan.currency || 'USD';
        const price = typeof plan.price === 'string' ? parseFloat(plan.price) : (plan.price || 0);
        const restrictions = plan.plan_restrictions?.[0] || { /* no-op */ };

        return {
          id: plan.id,
          title: plan.title,
          price: price,
          plan_type: plan.plan_type,
          plan_table_details: restrictions,
          is_popular: plan.is_popular,
          stripe_plan_id: plan.stripe_plan_id,
          currency
        };
      });

      return processedData as Plan[];
    },
    retry: 2,
    retryDelay: 1000,
  });

  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: "Failed to load pricing plans. Please try again later.",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  if (isLoading || isUserPlanLoading) {
    return <LoadingState />;
  }

  if (error || !plans) {
    return <ErrorState error={error as Error} />;
  }

  const standardPlans = plans.filter(plan => plan.title !== 'Enterprise');

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white pt-24 pb-16">
      <PageHead title="Pricing" description="Choose the right plan for your AI-powered workshop facilitation needs." />
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h1 className="text-4xl font-bold mb-4">Choose the Right Plan for Your Needs</h1>
          <p className="text-lg text-gray-600">
            Whether you're just starting out or looking to scale, we have a plan that's right for you.
          </p>
        </div>

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

        <div className="text-center mb-16">
          <p className="text-lg text-gray-600">
            For large organizations with custom needs, please{" "}
            <Link to="/contact" className="text-primary font-medium hover:underline">
              contact us
            </Link>
            .
          </p>
        </div>

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

        {standardPlans.length > 0 && <ComparisonTable plans={standardPlans} />}
      </div>
    </div>
  );
};

export default Pricing;
