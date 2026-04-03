/**
 * Payment Section
 *
 * Page for the AIfacilitator application.
 */

import React, { useState } from 'react';
import { CreditCard } from 'lucide-react';
import { CheckoutForm } from './CheckoutForm';
import { PaymentProvider } from './components/PaymentProvider';
import { CheckoutFormProps } from './types';

type PaymentSectionProps = CheckoutFormProps;

export const PaymentSection = ({
  plan,
  billingDetails,
  onCancel
}: PaymentSectionProps) => {
  const [isStripeLoading, setIsStripeLoading] = useState(true);

  // Handle Stripe loading state
  const handleStripeLoaded = () => {
    setIsStripeLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <CreditCard className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Payment Method</h3>
        <span className="text-sm text-muted-foreground">(Required)</span>
      </div>

      <PaymentProvider>
        <CheckoutForm
          plan={plan}
          billingDetails={billingDetails}
          onCancel={onCancel}
          onStripeLoaded={handleStripeLoaded}
          isStripeLoading={isStripeLoading}
        />
      </PaymentProvider>
    </div>
  );
};
