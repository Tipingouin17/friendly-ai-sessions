
import React from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { getSafeCookieParams } from '@/utils/crossOriginUtils';

// Initialize Stripe with a valid publishable key
// Use the proper Stripe test publishable key format that starts with pk_test_
const stripePromise = loadStripe('pk_test_51Ov1xjH5dusncBPeU9Cy97XPSXWQlTcK8VQJGwkbEJJbgzVZXqE7gvEwjD98JiW1DxIBphB0JMnDYNsxxp1OkPm100X0XG7Gl5', {
  stripeAccount: undefined, // Make sure no connected account is specified
});

interface StripeProviderProps {
  children: React.ReactNode;
}

export const StripeProvider = ({ children }: StripeProviderProps) => {
  // Get safe cookie parameters for cross-origin contexts
  const cookieParams = getSafeCookieParams();
  
  return (
    <Elements 
      stripe={stripePromise}
      options={{
        // Add Stripe Elements options to prevent CSP issues
        loader: 'auto',
        fonts: [
          {
            cssSrc: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
          },
        ],
        // Improve cookie handling with SameSite settings
        clientSecret: undefined,
        appearance: {
          theme: 'stripe',
        },
      }}
    >
      {children}
    </Elements>
  );
};
