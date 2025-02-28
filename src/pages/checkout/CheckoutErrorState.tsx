
import React from 'react';
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface CheckoutErrorStateProps {
  onBackToPricing: () => void;
}

export const CheckoutErrorState = ({ onBackToPricing }: CheckoutErrorStateProps) => {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container max-w-6xl mx-auto px-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">Error</CardTitle>
            <CardDescription className="text-center">
              We couldn't load the plan details. Please try again.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={onBackToPricing} className="w-full">
              Back to Pricing
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};
