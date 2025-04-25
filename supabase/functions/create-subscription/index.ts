
// Follow this setup guide to integrate the Deno runtime and Supabase functions in your project:
// https://supabase.com/docs/guides/functions/quickstart

import { serve } from "https://deno.land/std@0.131.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import Stripe from 'https://esm.sh/stripe@12.4.0?target=deno';

// Get Stripe key from environment, fail early if not available
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
if (!STRIPE_SECRET_KEY) {
  console.error('Missing required environment variable: STRIPE_SECRET_KEY');
}

// Validate input to prevent potential injection
const validateInputs = (body: any) => {
  // Required fields
  if (!body.planId || !body.stripePlanId || !body.userId || !body.billingDetails) {
    throw new Error('Missing required fields');
  }

  // Validate user ID format (UUID validation)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(body.userId)) {
    throw new Error('Invalid user ID format');
  }

  // Validate billing details
  if (!body.billingDetails.name || !body.billingDetails.email || !body.billingDetails.address) {
    throw new Error('Invalid billing details');
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(body.billingDetails.email)) {
    throw new Error('Invalid email format');
  }
}

const stripe = new Stripe(STRIPE_SECRET_KEY || '', {
  httpClient: Stripe.createFetchHttpClient(),
});

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse and validate request body
    let body;
    try {
      body = await req.json();
      validateInputs(body);
    } catch (e) {
      return new Response(
        JSON.stringify({ error: e instanceof Error ? e.message : 'Invalid request body' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }
    
    const { planId, stripePlanId, userId, billingDetails, returnUrl } = body;
    
    console.log(`Creating subscription for user ${userId} to plan ${planId} (Stripe plan: ${stripePlanId})`);
    
    if (!stripePlanId) {
      throw new Error('Stripe plan ID is required');
    }
    
    // Create a customer with sanitized inputs
    const customer = await stripe.customers.create({
      name: billingDetails.name,
      email: billingDetails.email,
      address: {
        line1: billingDetails.address.line1,
        city: billingDetails.address.city,
        state: billingDetails.address.state,
        postal_code: billingDetails.address.postal_code,
        country: billingDetails.address.country,
      },
      metadata: {
        supabase_user_id: userId
      }
    });
    
    console.log(`Created Stripe customer: ${customer.id}`);
    
    // Create the subscription with proper cross-origin support
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [
        { price: stripePlanId },
      ],
      payment_behavior: 'default_incomplete',
      payment_settings: { 
        save_default_payment_method: 'on_subscription',
        payment_method_options: {
          card: {
            // Allow stored credentials and other cross-site usage
            setup_future_usage: 'on_session',
          }
        }
      },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        supabase_user_id: userId,
        plan_id: planId
      }
    });
    
    console.log(`Created Stripe subscription: ${subscription.id}`);
    
    // Get the client secret from the invoice
    const invoice = subscription.latest_invoice as any;
    const clientSecret = invoice.payment_intent?.client_secret;
    
    if (!clientSecret) {
      throw new Error('Could not obtain client secret from subscription');
    }

    console.log('Successfully created subscription with client secret');
    
    return new Response(
      JSON.stringify({
        subscriptionId: subscription.id,
        customerId: customer.id,
        clientSecret: clientSecret,
      }),
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error creating subscription:', error);
    
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
