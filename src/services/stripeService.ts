import { supabase } from "@/integrations/supabase/client";

export interface StripePriceInfo {
    id: string;
    amount: number;
    currency: string;
    interval: 'month' | 'year' | null;
    productName?: string;
    active?: boolean;
}

export const getStripePrices = async (priceIds: string[]): Promise<StripePriceInfo[]> => {
    if (!priceIds.length) return [];

    const { data, error } = await supabase.functions.invoke('get-stripe-prices', {
        body: { priceIds }
    });

    if (error) {
        console.error('Error fetching Stripe prices:', error);
        throw error;
    }

    return data.prices || [];
};

export const createPortalSession = async (returnUrl?: string): Promise<{ url: string }> => {
    const { data, error } = await supabase.functions.invoke('create-portal-session', {
        body: { returnUrl: returnUrl || window.location.href }
    });

    if (error) {
        console.error('Error creating portal session:', error);
        throw error;
    }

    return data;
};
