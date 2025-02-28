
import React from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';

// Initialize Stripe with a valid publishable key
// Using a valid Stripe test publishable key format
const stripePromise = loadStripe('pk_test_51OcXwYGWmQRsACOr1hLGJ9uYXTPTilQwhNFZcC6jtXPMkj00jUPbIQgxOjXZkmKn1cPDZpIhNKGGPHuFJtVqelZ500vbDgQTDl', {
  stripeAccount: undefined, // Make sure no connected account is specified
});

interface StripeProviderProps {
  children: React.ReactNode;
}

export const StripeProvider = ({ children }: StripeProviderProps) => {
  return (
    <Elements stripe={stripePromise}>
      {children}
    </Elements>
  );
};
