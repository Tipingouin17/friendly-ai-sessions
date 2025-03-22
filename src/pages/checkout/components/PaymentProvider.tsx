
import React, { useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { getSafeCookieParams, handleStripeCookies, isInCrossOriginContext, isInIframe } from '@/utils/crossOriginUtils';

// Initialize Stripe with a valid publishable key
// Use the proper Stripe test publishable key format that starts with pk_test_
const stripePromise = loadStripe('pk_test_51Ov1xjH5dusncBPeU9Cy97XPSXWQlTcK8VQJGwkbEJJbgzVZXqE7gvEwjD98JiW1DxIBphB0JMnDYNsxxp1OkPm100X0XG7Gl5');

interface PaymentProviderProps {
  children: React.ReactNode;
}

export const PaymentProvider = ({ children }: PaymentProviderProps) => {
  // Get safe cookie parameters for cross-origin contexts
  const cookieParams = getSafeCookieParams();
  const isCrossOrigin = isInCrossOriginContext() || isInIframe();
  
  // Handle Stripe cookies in cross-origin contexts with more aggressive approach
  useEffect(() => {
    console.log("PaymentProvider: Setting up cookies with SameSite=None");
    
    // Force-set Stripe cookies with SameSite=None for cross-origin contexts
    const setStripeCookies = () => {
      // Define the expires date (7 days from now)
      const expires = new Date();
      expires.setTime(expires.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      // Always use 'None' for SameSite in cross-origin contexts
      const sameSite = isCrossOrigin ? 'None' : 'Lax';
      
      // Set the cookies with the appropriate attributes
      document.cookie = `__stripe_mid=placeholder_mid; expires=${expires.toUTCString()}; path=/; SameSite=${sameSite}; Secure`;
      document.cookie = `__stripe_sid=placeholder_sid; expires=${expires.toUTCString()}; path=/; SameSite=${sameSite}; Secure`;
      
      console.log("PaymentProvider: Stripe cookies set with SameSite=" + sameSite);
    };
    
    // Call immediately
    setStripeCookies();
    
    // Call again after a short delay to ensure cookies are set
    setTimeout(setStripeCookies, 100);
    
    // Set up interval to periodically check and fix Stripe cookies
    // This is especially important in cross-origin contexts
    const intervalId = setInterval(() => {
      handleStripeCookies();
      setStripeCookies();
    }, 3000); // Check every 3 seconds (reduced from 5)
    
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
