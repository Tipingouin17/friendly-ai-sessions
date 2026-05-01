/**
 * index
 *
 * Page for the AIfacilitator application.
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from "@/lib/api";
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

  // Fetch plan details using the plans table + plan_restrictions join
  const { data: plan, isLoading: planLoading, error: planError } = useQuery({
    queryKey: ['checkout-plan', planId],
    queryFn: async () => {
      if (!planId) throw new Error('No plan selected');

      // Convert planId from string to number before passing it to the query
      const numericPlanId = parseInt(planId, 10);
      if (isNaN(numericPlanId)) throw new Error('Invalid plan ID');

      // Query the plans table with plan_restrictions join (consistent with Pricing page)
      const { data, error } = await api
        .from('plans')
        .select('*, plan_restrictions(*)')
        .eq('id', numericPlanId)
        .single();

      if (error) throw error;

      const restrictions = data.plan_restrictions?.[0] || {};
      const price = typeof data.price === 'string' ? parseFloat(data.price) : (data.price || 0);

      // Process the data to match our Plan type using correct column names
      const processedPlan: Plan = {
        id: data.id,
        title: data.title,
        price: price,
        plan_type: data.plan_type,
        plan_table_details: {
          facilitator_limit: restrictions.facilitator_limit ?? null,
          session_limit: restrictions.session_limit ?? null,
          max_participants: restrictions.max_participants ?? null,
          question_limit: restrictions.question_limit ?? null,
          customisable_sessions: restrictions.customisable_sessions ?? false,
          customisable_facilitators: restrictions.customisable_facilitators ?? false,
          saved_sessions: restrictions.saved_sessions ?? false,
          session_reports: restrictions.session_reports ?? false,
          data_export: restrictions.data_export ?? false,
          priority_support: restrictions.priority_support ?? false,
          custom_branding: restrictions.custom_branding ?? false,
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
