
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Shield } from 'lucide-react';
import { Plan } from '../pricing/types';

interface OrderSummaryProps {
  plan: Plan;
}

export const OrderSummary = ({ plan }: OrderSummaryProps) => {
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
              <span>${plan.price}/mo</span>
            </div>
            
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Billing</span>
              <span>Monthly</span>
            </div>
            
            <Separator />
            
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>${plan.price}/month</span>
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
