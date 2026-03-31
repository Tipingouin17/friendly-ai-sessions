
import { supabase, EDGE_FUNCTION_URL, EDGE_FUNCTION_KEY } from '@/integrations/supabase/client';
import { BillingDetails } from '../types';
import { createSafeUrl, applySafeCookieParams, handleStripeCookies, setCrossDomainCookie } from '@/utils/crossOriginUtils';
import { CardElement } from '@stripe/react-stripe-js';

// Validate billing details before sending to API
const validateBillingDetails = (billingDetails: BillingDetails): string | null => {
  if (!billingDetails.name || billingDetails.name.trim().length < 2) {
    return "Please enter a valid name";
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!billingDetails.email || !emailRegex.test(billingDetails.email)) {
    return "Please enter a valid email address";
  }
  
  if (!billingDetails.address.line1 || billingDetails.address.line1.trim().length < 3) {
    return "Please enter a valid address";
  }
  
  if (!billingDetails.address.city || billingDetails.address.city.trim().length < 2) {
    return "Please enter a valid city";
  }
  
  if (!billingDetails.address.postal_code || billingDetails.address.postal_code.trim().length < 3) {
    return "Please enter a valid postal code";
  }
  
  if (!billingDetails.address.country || billingDetails.address.country.trim().length < 2) {
    return "Please enter a valid country";
  }
  
  return null;
};

export const createSubscription = async (
  plan: { id: number; stripe_plan_id?: string; title: string },
  userId: string,
  billingDetails: BillingDetails,
) => {
  // Validate inputs
  const validationError = validateBillingDetails(billingDetails);
  if (validationError) {
    throw new Error(validationError);
  }
  
  if (!plan?.id || !plan.stripe_plan_id) {
    throw new Error("Invalid plan configuration");
  }
  
  if (!userId) {
    throw new Error("User must be authenticated to create a subscription");
  }

  // Ensure Stripe cookies are properly handled before API call
  handleStripeCookies();
  
  // Create the return URL with proper cross-origin support
  const returnUrl = createSafeUrl('/profile');

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

  // Remove sensitive logging

  const response = await fetch(`${EDGE_FUNCTION_URL}/functions/v1/create-subscription`, fetchOptions);

  if (!response.ok) {
    const errorData = await response.json();
    console.error("Subscription creation failed with status:", response.status);
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
  // Validate inputs
  if (!stripe || !elements) {
    throw new Error("Stripe has not been initialized");
  }
  
  if (!clientSecret) {
    throw new Error("Missing client secret for payment confirmation");
  }
  
  const validationError = validateBillingDetails(billingDetails);
  if (validationError) {
    throw new Error(validationError);
  }

  // Ensure Stripe cookies are properly handled before API call
  handleStripeCookies();
  
  // Get the card element
  const cardElement = elements.getElement(CardElement);
  if (!cardElement) {
    throw new Error('Card element not found');
  }

  // Validate return URL
  const safeReturnUrl = createSafeUrl(returnUrl);

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
    return_url: safeReturnUrl,
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
  // Validate inputs
  if (!subscriptionId || !customerId || !userId || !planId) {
    throw new Error("Missing required parameters for subscription confirmation");
  }
  
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

  // Remove sensitive logging

  const confirmResponse = await fetch(`${EDGE_FUNCTION_URL}/functions/v1/confirm-subscription`, confirmOptions);

  if (!confirmResponse.ok) {
    const errorData = await confirmResponse.json();
    console.error("Subscription confirmation failed with status:", confirmResponse.status);
    throw new Error(errorData.error || 'Failed to confirm subscription');
  }

  return await confirmResponse.json();
};
