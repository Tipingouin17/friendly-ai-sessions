
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

const Pricing = () => {
  const { toast } = useToast();
  const { currentPlanId, isLoading: isUserPlanLoading } = useUserPlan();

  const { data: plans, isLoading, error } = useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .order('price', { ascending: true });
      
      if (error) throw error;
      
      // Process the data to include currency information and ensure correct price format
      const processedData = data.map(plan => {
        // Set default currency since it doesn't exist in the database schema
        const defaultCurrency = 'USD';
        
        // Convert price to Stripe format (cents) if needed
        let price = plan.price || 0;
        if (price < 100 && price > 0) {
          price = price * 100; // Convert to cents for Stripe
        }
        
        // If the plan is Premium, set price to 10000 cents (100 dollars)
        if (plan.title === 'Premium') {
          price = 10000; // $100 in cents
        }
        
        return {
          ...plan,
          price,
          currency: defaultCurrency // Add currency property to each plan
        };
      });
      
      return processedData as Plan[];
    }
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

  // Filter out Enterprise plan from standard plans display
  const standardPlans = plans.filter(plan => plan.title !== 'Enterprise');
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white pt-24 pb-16">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h1 className="text-4xl font-bold mb-4">Choose the Right Plan for Your Needs</h1>
          <p className="text-lg text-gray-600">
            Whether you're just starting out or looking to scale, we have a plan that's right for you.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-8">
          {standardPlans.map((plan) => (
            <StandardPlanCard 
              key={plan.id} 
              plan={plan} 
              isCurrentPlan={plan.id === currentPlanId}
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

        {standardPlans.length > 0 && <ComparisonTable plans={standardPlans} />}
      </div>
    </div>
  );
};

export default Pricing;
