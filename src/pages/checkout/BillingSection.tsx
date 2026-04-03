/**
 * Billing Section
 *
 * Page for the AIfacilitator application.
 */

import React from 'react';
import { User } from 'lucide-react';
import { BillingForm } from './BillingForm';
import { BillingDetails } from './types';

interface BillingSectionProps {
  billingDetails: BillingDetails;
  handleBillingDetailsChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const BillingSection = ({ 
  billingDetails, 
  handleBillingDetailsChange 
}: BillingSectionProps) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <User className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Billing Information</h3>
        <span className="text-sm text-muted-foreground">(Fields marked with <span className="text-destructive">*</span> are required)</span>
      </div>
      
      <BillingForm 
        billingDetails={billingDetails}
        handleBillingDetailsChange={handleBillingDetailsChange}
      />
    </div>
  );
};
