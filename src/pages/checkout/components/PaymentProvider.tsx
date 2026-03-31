
import React, { useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { getSafeCookieParams, handleStripeCookies, isInCrossOriginContext, isInIframe } from '@/utils/crossOriginUtils';

// Read Stripe publishable key from environment variable.
// Set VITE_STRIPE_PUBLISHABLE_KEY in your Vercel / Railway environment.
// The fallback value is the live publishable key (safe to expose — it is NOT a secret key).
const getStripePublishableKey = (): string => {
  const key =
    import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ||
    'pk_live_51NQ84KK0lFUZlqguiHpmAcNEoAg1UT7GMfyuE45TiBR8NHY4qJXSKW9abcnILEjTCh2C5fPDP0qly5cql2j7pqG500cpdTJT3O';

  if (!key) {
    console.error('Stripe publishable key is not set');
    throw new Error('Stripe configuration is missing');
  }

  // Validate that it's a publishable key (starts with pk_)
  if (!key.startsWith('pk_')) {
    console.error('Invalid Stripe publishable key format');
    throw new Error('Invalid Stripe key configuration');
  }

  return key;
};

// Initialize Stripe with validated key
const stripePromise = loadStripe(getStripePublishableKey());

interface PaymentProviderProps {
  children: React.ReactNode;
}

export const PaymentProvider = ({ children }: PaymentProviderProps) => {
  // Get safe cookie parameters for cross-origin contexts
  const cookieParams = getSafeCookieParams();
  const isCrossOrigin = isInCrossOriginContext() || isInIframe();

  // Handle Stripe cookies in cross-origin contexts with more aggressive approach
  useEffect(() => {

    // Force-set Stripe cookies with SameSite=None for cross-origin contexts
    const setStripeCookies = () => {
      // Define the expires date (7 days from now)
      const expires = new Date();
      expires.setTime(expires.getTime() + 7 * 24 * 60 * 60 * 1000);

      // Always use 'None' for SameSite in cross-origin contexts
      const sameSite = isCrossOrigin ? 'None' : 'Lax';

      // Set the cookies with the appropriate attributes
      document.cookie = `__stripe_mid=; expires=${expires.toUTCString()}; path=/; SameSite=${sameSite}; Secure`;
      document.cookie = `__stripe_sid=; expires=${expires.toUTCString()}; path=/; SameSite=${sameSite}; Secure`;
    };

    // Call immediately
    setStripeCookies();

    // Set up interval to periodically check and fix Stripe cookies
    const intervalId = setInterval(() => {
      handleStripeCookies();
      setStripeCookies();
    }, 3000);

    // Cleanup function to clear interval
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isCrossOrigin]);

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
        // Set up appearance
        appearance: {
          theme: 'stripe',
        },
      }}
    >
      {children}
    </Elements>
  );
};
