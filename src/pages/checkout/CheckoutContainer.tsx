
import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Plan } from '../pricing/types';
import { BillingDetails } from './types';
import { PlanDetails } from './PlanDetails';
import { BillingSection } from './BillingSection';
import { PaymentSection } from './PaymentSection';
import { OrderSummary } from './OrderSummary';

interface CheckoutContainerProps {
  plan: Plan;
  billingDetails: BillingDetails;
  handleBillingDetailsChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBackToPricing: () => void;
}

export const CheckoutContainer = ({ 
  plan,
  billingDetails,
  handleBillingDetailsChange,
  onBackToPricing
}: CheckoutContainerProps) => {
  return (
    <div className="min-h-screen pt-16 pb-16 bg-gray-50">
      <div className="container max-w-6xl mx-auto px-4">
        <Button 
          variant="ghost" 
          className="mb-6" 
          onClick={onBackToPricing}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Pricing
        </Button>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column: Plan details and summary */}
          <div className="lg:col-span-2">
            <Card className="mb-8">
              <CardHeader className="border-b">
                <CardTitle className="text-2xl font-bold text-left">
                  Complete Your Order
                </CardTitle>
                <CardDescription className="text-left">
                  You're upgrading to the {plan.title} Plan
                </CardDescription>
              </CardHeader>
              
              <CardContent className="pt-6">
                <div className="space-y-8">
                  {/* Plan Details Section */}
                  <PlanDetails plan={plan} />
                  
                  <Separator />
                  
                  {/* Billing Information Section */}
                  <BillingSection 
                    billingDetails={billingDetails}
                    handleBillingDetailsChange={handleBillingDetailsChange}
                  />
                  
                  <Separator />
                  
                  {/* Payment Information Section */}
                  <PaymentSection 
                    plan={plan}
                    billingDetails={billingDetails}
                    onCancel={onBackToPricing}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Right column: Order summary */}
          <div className="lg:col-span-1">
            <OrderSummary plan={plan} />
          </div>
        </div>
      </div>
    </div>
  );
};
