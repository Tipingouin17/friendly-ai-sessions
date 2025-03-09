
import React from 'react';
import { CardElement } from '@stripe/react-stripe-js';
import { Label } from '@/components/ui/label';

interface PaymentMethodInputProps {
  hasError: boolean;
  errorMessage?: string;
}

export const PaymentMethodInput = ({ hasError, errorMessage }: PaymentMethodInputProps) => {
  return (
    <div className="p-4 border rounded-lg">
      <Label htmlFor="card-element" className="text-left block mb-2">
        Card Details <span className="text-destructive">*</span>
      </Label>
      <div className={`p-4 border rounded-md bg-white ${hasError ? 'border-destructive ring-2 ring-destructive' : ''}`}>
        <CardElement 
          id="card-element"
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#424770',
                '::placeholder': {
                  color: '#aab7c4',
                },
              },
              invalid: {
                color: '#ef4444',
              },
            },
            hidePostalCode: true,
          }} 
        />
      </div>
      {hasError && errorMessage && (
        <p className="mt-1 text-sm text-destructive">{errorMessage}</p>
      )}
    </div>
  );
};
