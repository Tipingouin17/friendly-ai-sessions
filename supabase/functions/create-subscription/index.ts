
// Follow this setup guide to integrate the Deno runtime and Supabase functions in your project:
// https://supabase.com/docs/guides/functions/quickstart

import { serve } from "https://deno.land/std@0.131.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import Stripe from 'https://esm.sh/stripe@12.4.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  httpClient: Stripe.createFetchHttpClient(),
});

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { planId, stripePlanId, userId, billingDetails, returnUrl } = await req.json();
    
    console.log("Received request with planId:", planId);
    console.log("Stripe plan ID:", stripePlanId);
    
    // Get supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // Get the plan details from the database
    const { data: planData, error: planError } = await supabaseClient
      .from('plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (planError) {
      throw new Error(`Error fetching plan: ${planError.message}`);
    }

    // Use the provided Stripe plan ID (price ID)
    if (!stripePlanId) {
      throw new Error('This plan does not have a valid Stripe plan ID');
    }

    // Create a Customer
    const customer = await stripe.customers.create({
      email: billingDetails.email,
      name: billingDetails.name,
      address: billingDetails.address,
    });

    console.log("Created Stripe customer:", customer.id);

    // Create a subscription
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: stripePlanId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    });

    console.log("Created subscription:", subscription.id);

    // Get the client secret for the payment intent
    const invoice = subscription.latest_invoice as Stripe.Invoice;
    const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent;
    const clientSecret = paymentIntent.client_secret;

    console.log("Payment intent created, returning client secret");

    // Return the client secret and subscription ID
    return new Response(
      JSON.stringify({ 
        clientSecret,
        subscriptionId: subscription.id,
        customerId: customer.id
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in create-subscription:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

// Helper to create Supabase client
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.1.0';
