import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"
import Stripe from 'https://esm.sh/stripe@14.21.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
    apiVersion: '2023-10-16',
})

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { priceIds } = await req.json()

        if (!priceIds || !Array.isArray(priceIds)) {
            throw new Error('priceIds array is required')
        }

        console.log(`Fetching prices for: ${priceIds.join(', ')}`)

        const prices = await Promise.all(
            priceIds.map(async (priceId: string) => {
                try {
                    // Retrieve price with product details expanded
                    const price = await stripe.prices.retrieve(priceId, {
                        expand: ['product']
                    })

                    return {
                        id: price.id,
                        amount: price.unit_amount,
                        currency: price.currency,
                        interval: price.recurring?.interval,
                        productName: (price.product as any).name,
                        active: price.active
                    }
                } catch (error) {
                    console.error(`Error fetching price ${priceId}:`, error)
                    return null
                }
            })
        )

        // Filter out any failed fetches
        const validPrices = prices.filter(p => p !== null)

        return new Response(JSON.stringify({ prices: validPrices }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    } catch (error) {
        console.error('Error in get-stripe-prices:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
