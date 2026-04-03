/**
 * Order Summary
 *
 * Page for the AIfacilitator application.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Shield, DollarSign, Euro, PoundSterling } from 'lucide-react';
import { Plan } from '../pricing/types';

interface OrderSummaryProps {
  plan: Plan;
  promoCode?: string;
  setPromoCode?: React.Dispatch<React.SetStateAction<string>>;
}

export const OrderSummary = ({ plan }: OrderSummaryProps) => {
  // Format price with correct currency symbol
  const formatPrice = (price: number, currency: string = 'USD') => {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
    return formatter.format(price);
  };

  // Get appropriate currency icon
  const CurrencyIcon = () => {
    const currency = plan.currency?.toUpperCase() || 'USD';
    switch (currency) {
      case 'EUR':
        return <Euro className="h-4 w-4 text-primary" />;
      case 'GBP':
        return <PoundSterling className="h-4 w-4 text-primary" />;
      case 'USD':
      default:
        return <DollarSign className="h-4 w-4 text-primary" />;
    }
  };

  const formattedPrice = formatPrice(plan.price, plan.currency);

  return (
    <div className="sticky top-24">
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-left">Order Summary</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex justify-between">
              <span>{plan.title} Plan</span>
              <span className="flex items-center">{formattedPrice}/mo</span>
            </div>

            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Billing</span>
              <span>Monthly</span>
            </div>

            <Separator />

            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span className="flex items-center">{formattedPrice}/month</span>
            </div>

            <div className="pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                <Shield className="h-4 w-4" />
                <span>Secure payment processing</span>
              </div>
              <div className="text-xs text-muted-foreground">
                Your payment information is encrypted and secure. We never store your full credit card details.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
