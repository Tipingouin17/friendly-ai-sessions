
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Plan } from '../pricing/types';
import { BillingDetails } from './types';
import { CheckoutContainer } from './CheckoutContainer';
import { CheckoutLoadingState } from './CheckoutLoadingState';
import { CheckoutErrorState } from './CheckoutErrorState';

const Checkout = () => {
  const [searchParams] = useSearchParams();
  const planId = searchParams.get('plan');
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [billingDetails, setBillingDetails] = useState<BillingDetails>({
    name: '',
    email: user?.email || '',
    address: {
      line1: '',
      city: '',
      state: '',
      postal_code: '',
      country: '',
    },
  });

  // Fetch plan details
  const { data: plan, isLoading: planLoading, error: planError } = useQuery({
    queryKey: ['checkout-plan', planId],
    queryFn: async () => {
      if (!planId) throw new Error('No plan selected');
      
      // Convert planId from string to number before passing it to the query
      const numericPlanId = parseInt(planId, 10);
      if (isNaN(numericPlanId)) throw new Error('Invalid plan ID');
      
      // Query the plan_features view instead of the plans table
      const { data, error } = await supabase
        .from('plan_features')
        .select('*')
        .eq('id', numericPlanId)
        .single();
      
      if (error) throw error;
      
      // Process the data to match our Plan type
      const processedPlan: Plan = {
        id: data.id,
        title: data.title,
        price: data.price || 0,
        plan_type: data.plan_type,
        plan_table_details: {
          no_of_facilitator: data.no_of_facilitator,
          no_of_sessions: data.no_of_sessions,
          max_participants: data.max_participants,
          customisable_sessions: data.customisable_sessions,
          customisable_facilitators: data.customisable_facilitators,
          saved_sessions: data.saved_sessions,
          session_reports: data.session_reports,
          data_export: data.data_export
        },
        is_popular: data.is_popular,
        stripe_plan_id: data.stripe_plan_id,
        currency: data.currency
      };
      
      return processedPlan;
    },
  });

  // Handle back to pricing
  const handleBackToPricing = () => {
    navigate('/pricing');
  };

  // Update billing details
  const handleBillingDetailsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setBillingDetails(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof typeof prev] as object,
          [child]: value
        }
      }));
    } else {
      setBillingDetails(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // If no plan is selected, redirect back to pricing
  useEffect(() => {
    if (!planId) {
      toast({
        title: "Error",
        description: "Please select a plan first",
        variant: "destructive",
      });
      navigate('/pricing');
    }
  }, [planId, navigate, toast]);

  // If no user is logged in, redirect to login
  useEffect(() => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to continue with your purchase",
        variant: "destructive",
      });
      navigate('/login?redirect=/checkout?plan=' + planId);
    }
  }, [user, planId, navigate, toast]);

  // Loading state
  if (planLoading) {
    return <CheckoutLoadingState />;
  }

  // Error state
  if (planError || !plan) {
    return <CheckoutErrorState onBackToPricing={handleBackToPricing} />;
  }

  return (
    <CheckoutContainer
      plan={plan}
      billingDetails={billingDetails}
      handleBillingDetailsChange={handleBillingDetailsChange}
      onBackToPricing={handleBackToPricing}
    />
  );
};

export default Checkout;
