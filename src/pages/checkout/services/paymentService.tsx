
import { supabase } from '@/integrations/supabase/client';
import { EDGE_FUNCTION_URL, EDGE_FUNCTION_KEY } from '@/integrations/supabase/client';
import { BillingDetails } from '../types';
import { createSafeUrl, applySafeCookieParams, handleStripeCookies, setCrossDomainCookie } from '@/utils/crossOriginUtils';
import { CardElement } from '@stripe/react-stripe-js';

export const createSubscription = async (
  plan: { id: number; stripe_plan_id?: string; title: string },
  userId: string,
  billingDetails: BillingDetails,
) => {
  // Ensure Stripe cookies are properly handled before API call
  handleStripeCookies();
  
  // Create the return URL with proper cross-origin support
  const returnUrl = createSafeUrl('/profile');
  console.log("Using return URL:", returnUrl);

  // Apply safe cookie parameters to fetch options
  const fetchOptions = applySafeCookieParams({
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${EDGE_FUNCTION_KEY}`,
    },
    body: JSON.stringify({ 
      planId: plan.id,
      stripePlanId: plan.stripe_plan_id,
      userId: userId,
      billingDetails,
      returnUrl: returnUrl,
    }),
  });

  console.log("Creating subscription with fetch options:", JSON.stringify(fetchOptions));

  const response = await fetch(`${EDGE_FUNCTION_URL}/functions/v1/create-subscription`, fetchOptions);

  if (!response.ok) {
    const errorData = await response.json();
    console.error("Subscription creation failed:", errorData);
    throw new Error(errorData.error || 'Failed to create subscription');
  }

  return await response.json();
};

export const confirmPayment = async (
  stripe: any,
  elements: any,
  clientSecret: string, 
  billingDetails: BillingDetails,
  returnUrl: string
) => {
  // Ensure Stripe cookies are properly handled before API call
  handleStripeCookies();
  
  // Get the card element
  const cardElement = elements.getElement(CardElement);
  if (!cardElement) {
    throw new Error('Card element not found');
  }

  console.log("Confirming payment with returnUrl:", returnUrl);

  // Set up payment confirmation options
  const confirmPaymentOptions = {
    payment_method: {
      card: cardElement,
      billing_details: {
        name: billingDetails.name,
        email: billingDetails.email,
        address: {
          line1: billingDetails.address.line1,
          city: billingDetails.address.city,
          state: billingDetails.address.state,
          postal_code: billingDetails.address.postal_code,
          country: billingDetails.address.country,
        }
      }
    },
    return_url: returnUrl,
  };

  // Confirm the payment
  return await stripe.confirmCardPayment(clientSecret, confirmPaymentOptions);
};

export const confirmSubscription = async (
  subscriptionId: string,
  customerId: string,
  userId: string,
  planId: number,
  paymentIntentId?: string
) => {
  // Ensure Stripe cookies are properly handled before API call
  handleStripeCookies();
  
  // Apply safe cookie parameters to fetch options
  const confirmOptions = applySafeCookieParams({
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${EDGE_FUNCTION_KEY}`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
    body: JSON.stringify({ 
      subscriptionId,
      customerId,
      userId,
      planId,
      paymentIntentId
    }),
  });

  console.log("Confirming subscription with options:", JSON.stringify(confirmOptions));

  const confirmResponse = await fetch(`${EDGE_FUNCTION_URL}/functions/v1/confirm-subscription`, confirmOptions);

  if (!confirmResponse.ok) {
    const errorData = await confirmResponse.json();
    console.error("Subscription confirmation failed:", errorData);
    throw new Error(errorData.error || 'Failed to confirm subscription');
  }

  return await confirmResponse.json();
};
