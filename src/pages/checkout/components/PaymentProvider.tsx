
import React, { useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { getSafeCookieParams, handleStripeCookies } from '@/utils/crossOriginUtils';

// Initialize Stripe with a valid publishable key
// Use the proper Stripe test publishable key format that starts with pk_test_
const stripePromise = loadStripe('pk_test_51Ov1xjH5dusncBPeU9Cy97XPSXWQlTcK8VQJGwkbEJJbgzVZXqE7gvEwjD98JiW1DxIBphB0JMnDYNsxxp1OkPm100X0XG7Gl5', {
  stripeAccount: undefined, // Make sure no connected account is specified
  betas: ['stripe_xplat_issuing_beta_1'], // Enable cross-platform features
});

interface PaymentProviderProps {
  children: React.ReactNode;
}

export const PaymentProvider = ({ children }: PaymentProviderProps) => {
  // Get safe cookie parameters for cross-origin contexts
  const cookieParams = getSafeCookieParams();
  
  // Handle Stripe cookies in cross-origin contexts
  useEffect(() => {
    handleStripeCookies();
  }, []);
  
  return (
    <Elements 
      stripe={stripePromise}
      options={{
        // Add Stripe Elements options for better CSP compatibility
        loader: 'auto',
        fonts: [
          {
            cssSrc: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
          },
        ],
        // Improve cookie handling with SameSite settings
        appearance: {
          theme: 'stripe',
        },
      }}
    >
      {children}
    </Elements>
  );
};
