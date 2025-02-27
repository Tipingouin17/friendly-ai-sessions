
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
    const { subscriptionId, customerId, userId, planId, paymentIntentId } = await req.json();
    
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in confirm-subscription:', error);
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
