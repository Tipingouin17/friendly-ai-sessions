
import React, { useState } from 'react';
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

export const CheckoutForm = ({ 
  plan, 
  billingDetails,
  onCancel 
}: CheckoutFormProps) => {
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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    console.log("Stripe loaded?", !!stripe);
    console.log("Elements loaded?", !!elements);
    console.log("User logged in?", !!user);
    
    if (!user) {
      setError("You must be logged in to complete this purchase.");
      return;
    }

    setError(null);
    setFieldErrors({});
    
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
      console.log("Creating subscription with plan ID:", plan.id);
      console.log("Using stripe plan ID:", plan.stripe_plan_id);
      
      if (process.env.NODE_ENV === 'development' || !stripe || !elements || !plan.stripe_plan_id) {
        console.log("⚠️ Using direct database update (development mode or Stripe not available)");
        
        await updateUserSubscription(user.id, plan.id);
        
        toast({
          title: "Success",
          description: `You've successfully subscribed to the ${plan.title} plan!`,
        });
        
        navigate('/profile');
        return;
      }

      const returnUrl = createSafeUrl('/profile');
      
      // Create the subscription
      const { clientSecret, subscriptionId, customerId } = await createSubscription(
        plan,
        user.id,
        billingDetails
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
      <ValidationErrors 
        fieldErrors={fieldErrors} 
        generalError={error} 
      />
      
      <PaymentMethodInput 
        hasError={hasFieldError('card')} 
        errorMessage={fieldErrors['card']} 
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
