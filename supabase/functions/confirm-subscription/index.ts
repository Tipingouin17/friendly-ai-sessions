// Follow this setup guide to integrate the Deno runtime and Supabase functions in your project:
// https://supabase.com/docs/guides/functions/quickstart

import { serve } from "https://deno.land/std@0.131.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import Stripe from 'https://esm.sh/stripe@12.4.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.1.0';

// Get Stripe key from environment, fail early if not available
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
if (!STRIPE_SECRET_KEY) {
  console.error('Missing required environment variable: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(STRIPE_SECRET_KEY || '', {
  httpClient: Stripe.createFetchHttpClient(),
});

// Validate input to prevent potential injection
const validateInputs = (body: any) => {
  // Required fields
  if (!body.subscriptionId || !body.customerId || !body.userId || !body.planId) {
    throw new Error('Missing required fields');
  }

  // Validate user ID format (UUID validation)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(body.userId)) {
    throw new Error('Invalid user ID format');
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
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

    const { subscriptionId, customerId, userId, planId, paymentIntentId } = body;

    // Get supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // Verify the payment intent status
    if (paymentIntentId) {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      if (paymentIntent.status !== 'succeeded') {
        throw new Error('Payment has not been completed');
      }
    }

    // Update the customer metadata with the user ID for reference
    await stripe.customers.update(customerId, {
      metadata: { supabase_user_id: userId },
    });

    // Update the subscription metadata with the user ID for reference
    await stripe.subscriptions.update(subscriptionId, {
      metadata: { supabase_user_id: userId },
    });

    // Update the user's profile with the plan ID and subscription info
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({
        current_plan_id: planId,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        subscription_status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating user profile:', updateError);
      throw new Error(`Failed to update user profile: ${updateError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Subscription confirmed and user profile updated',
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
    console.error('Error in confirm-subscription:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
