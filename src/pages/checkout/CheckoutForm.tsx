/**
 * Checkout Form
 *
 * Page for the AIfacilitator application.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import { CheckoutFormProps } from './types';
import { createSafeUrl } from '@/utils/crossOriginUtils';
import { ValidationErrors } from './components/ValidationErrors';
import { PaymentMethodInput } from './components/PaymentMethodInput';
import { CheckoutActions } from './components/CheckoutActions';
import { useCheckoutFormValidation } from './hooks/useCheckoutFormValidation';
import { updateUserSubscription } from './utils/subscriptionUtils';
import { createSubscription, confirmPayment, confirmSubscription } from './services/paymentService';
import { trackPurchase } from '@/lib/tracking';
import { Loader2 } from 'lucide-react';

interface ExtendedCheckoutFormProps extends CheckoutFormProps {
  isStripeLoading?: boolean;
  onStripeLoaded?: () => void;
  /** Validated Stripe coupon ID to apply to this payment. */
  couponId?: string | null;
}

export const CheckoutForm = ({ 
  plan, 
  billingDetails,
  onCancel,
  isStripeLoading = false,
  onStripeLoaded,
  couponId,
}: ExtendedCheckoutFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { 
    fieldErrors, 
    setFieldErrors, 
    error, 
    setError, 
    validateForm, 
    hasFieldError 
  } = useCheckoutFormValidation();

  // Check if Stripe is loaded
  useEffect(() => {
    if (stripe && elements && onStripeLoaded) {
      onStripeLoaded();
    }
  }, [stripe, elements, onStripeLoaded]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!user) {
      setError("You must be logged in to complete this purchase.");
      return;
    }

    setError(null);
    setFieldErrors({ /* no-op */ });
    
    const newFieldErrors = validateForm(billingDetails, stripe, elements);
    
    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      
      const firstErrorField = Object.keys(newFieldErrors)[0];
      const errorElement = document.getElementById(firstErrorField);
      if (errorElement) {
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        errorElement.focus();
      }
      
      toast({
        title: "Please check your information",
        description: "There are some required fields that need to be filled out.",
        variant: "destructive",
      });
      
      return;
    }

    setLoading(true);

    try {
      
      if (import.meta.env.DEV || !stripe || !elements || !plan.stripe_plan_id) {
        
        await updateUserSubscription(user.id, plan.id);
        trackPurchase(`dev-${plan.id}-${Date.now()}`, Number(plan.price), plan.currency || 'EUR', {
          email: billingDetails.email || user.email,
        });
        
        toast({
          title: "Success",
          description: `You've successfully subscribed to the ${plan.title} plan!`,
        });
        
        navigate('/profile');
        return;
      }

      const returnUrl = createSafeUrl('/profile');
      
      // Create the subscription (couponId is passed so the backend applies the discount)
      const { clientSecret, subscriptionId, customerId } = await createSubscription(
        plan,
        user.id,
        billingDetails,
        couponId ?? undefined
      );

      // Confirm the payment
      const { error: paymentError, paymentIntent } = await confirmPayment(
        stripe,
        elements,
        clientSecret,
        billingDetails,
        returnUrl
      );

      if (paymentError) {
        if (paymentError.type === 'card_error') {
          setFieldErrors({ card: paymentError.message || 'Card error' });
          
          const cardContainer = document.querySelector('.p-4.border.rounded-md.bg-white');
          if (cardContainer) {
            cardContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
        
        throw new Error(paymentError.message || 'Payment failed');
      }

      // Confirm the subscription
      await confirmSubscription(
        subscriptionId,
        customerId,
        user.id,
        plan.id,
        paymentIntent?.id
      );
      trackPurchase(paymentIntent?.id || subscriptionId, Number(plan.price), plan.currency || 'EUR', {
        email: billingDetails.email || user.email,
      });

      toast({
        title: "Success",
        description: `You've successfully subscribed to the ${plan.title} plan!`,
      });

      navigate('/profile');
      
    } catch (err: any) {
      console.error('Payment error:', err);
      setError(err.message || 'An error occurred during payment processing. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Display a loading indicator while Stripe is initializing
  if (isStripeLoading) {
    return (
      <div className="p-6 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading payment processor...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
      <ValidationErrors 
        fieldErrors={fieldErrors} 
        generalError={error} 
      />
      
      <PaymentMethodInput 
        hasError={hasFieldError('card')} 
        errorMessage={fieldErrors['card']}
        isLoading={isStripeLoading}
      />

      <CheckoutActions 
        price={plan.price}
        currency={plan.currency}
        isLoading={loading}
        onCancel={onCancel}
      />
    </form>
  );
};
