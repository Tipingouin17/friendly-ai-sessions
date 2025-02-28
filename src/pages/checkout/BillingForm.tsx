
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BillingDetails } from './types';

interface BillingFormProps {
  billingDetails: BillingDetails;
  handleBillingDetailsChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

// Helper for required field label
const RequiredLabel = ({ htmlFor, children }: { htmlFor: string, children: React.ReactNode }) => (
  <Label htmlFor={htmlFor} className="text-left block">
    {children} <span className="text-destructive">*</span>
  </Label>
);

export const BillingForm = ({ 
  billingDetails, 
  handleBillingDetailsChange 
}: BillingFormProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
      <div className="space-y-2">
        <RequiredLabel htmlFor="name">Full Name</RequiredLabel>
        <Input 
          id="name" 
          name="name" 
          value={billingDetails.name} 
          onChange={handleBillingDetailsChange} 
          required 
          className="text-left"
          aria-required="true"
        />
      </div>
      <div className="space-y-2">
        <RequiredLabel htmlFor="email">Email</RequiredLabel>
        <Input 
          id="email" 
          name="email" 
          type="email" 
          value={billingDetails.email} 
          onChange={handleBillingDetailsChange} 
          required 
          className="text-left"
          aria-required="true"
        />
      </div>
      <div className="space-y-2 md:col-span-2">
        <RequiredLabel htmlFor="address.line1">Address</RequiredLabel>
        <Input 
          id="address.line1" 
          name="address.line1" 
          value={billingDetails.address.line1} 
          onChange={handleBillingDetailsChange} 
          required 
          className="text-left"
          aria-required="true"
        />
      </div>
      <div className="space-y-2">
        <RequiredLabel htmlFor="address.city">City</RequiredLabel>
        <Input 
          id="address.city" 
          name="address.city" 
          value={billingDetails.address.city} 
          onChange={handleBillingDetailsChange} 
          required 
          className="text-left"
          aria-required="true"
        />
      </div>
      <div className="space-y-2">
        <RequiredLabel htmlFor="address.state">State/Province</RequiredLabel>
        <Input 
          id="address.state" 
          name="address.state" 
          value={billingDetails.address.state} 
          onChange={handleBillingDetailsChange} 
          required 
          className="text-left"
          aria-required="true"
        />
      </div>
      <div className="space-y-2">
        <RequiredLabel htmlFor="address.postal_code">Postal Code</RequiredLabel>
        <Input 
          id="address.postal_code" 
          name="address.postal_code" 
          value={billingDetails.address.postal_code} 
          onChange={handleBillingDetailsChange} 
          required 
          className="text-left"
          aria-required="true"
        />
      </div>
      <div className="space-y-2">
        <RequiredLabel htmlFor="address.country">Country</RequiredLabel>
        <Input 
          id="address.country" 
          name="address.country" 
          value={billingDetails.address.country} 
          onChange={handleBillingDetailsChange} 
          required 
          className="text-left"
          aria-required="true"
        />
      </div>
    </div>
  );
};
