
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
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { planId, stripePlanId, userId, billingDetails, returnUrl } = await req.json();
    
    console.log(`Creating subscription for user ${userId} to plan ${planId} (Stripe plan: ${stripePlanId})`);
    
    if (!stripePlanId) {
      throw new Error('Stripe plan ID is required');
    }
    
    // Create a customer
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
    
    // Create the subscription
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [
        { price: stripePlanId },
      ],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error creating subscription:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
