import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import { EDGE_FUNCTION_URL, EDGE_FUNCTION_KEY } from '@/integrations/supabase/client';
import { CheckoutFormProps } from './types';
import { supabase } from '@/integrations/supabase/client';
import { createSafeUrl, applySafeCookieParams } from '@/utils/crossOriginUtils';
import { ValidationErrors } from './components/ValidationErrors';
import { PaymentMethodInput } from './components/PaymentMethodInput';
import { CheckoutActions } from './components/CheckoutActions';

export const CheckoutForm = ({ 
  plan, 
  billingDetails,
  onCancel 
}: CheckoutFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const updateUserSubscription = async (planId: number) => {
    if (!user) {
      throw new Error("User must be logged in to update subscription");
    }
    
    console.log("Updating user subscription:", {
      userId: user.id,
      planId: planId
    });
    
    const { data, error: updateError } = await supabase
      .from('profiles')
      .update({ 
        current_plan_id: planId, 
        subscription_status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select();
      
    if (updateError) {
      console.error('Error updating user profile:', updateError);
      throw new Error('Failed to update user profile with new subscription');
    }
    
    console.log("Subscription update successful:", data);
    
    return data;
  };

  const validateForm = (): Record<string, string> => {
    const newFieldErrors: Record<string, string> = {};
    
    if (!billingDetails.name) {
      newFieldErrors['name'] = "Full name is required";
    }
    
    if (!billingDetails.email) {
      newFieldErrors['email'] = "Email is required";
    } else if (!/^\S+@\S+\.\S+$/.test(billingDetails.email)) {
      newFieldErrors['email'] = "Please enter a valid email address";
    }
    
    if (!billingDetails.address.line1) {
      newFieldErrors['address.line1'] = "Address is required";
    }
    
    if (!billingDetails.address.city) {
      newFieldErrors['address.city'] = "City is required";
    }
    
    if (!billingDetails.address.state) {
      newFieldErrors['address.state'] = "State/Province is required";
    }
    
    if (!billingDetails.address.postal_code) {
      newFieldErrors['address.postal_code'] = "Postal code is required";
    }
    
    if (!billingDetails.address.country) {
      newFieldErrors['address.country'] = "Country is required";
    }
    
    if (stripe && elements) {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        newFieldErrors['card'] = "Payment form not loaded properly";
      }
    }
    
    return newFieldErrors;
  };

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
    
    const newFieldErrors = validateForm();
    
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
        
        await updateUserSubscription(plan.id);
        
        toast({
          title: "Success",
          description: `You've successfully subscribed to the ${plan.title} plan!`,
        });
        
        navigate('/profile');
        return;
      }

      const returnUrl = createSafeUrl('/profile');
      console.log("Using return URL:", returnUrl);

      const fetchOptions = applySafeCookieParams({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${EDGE_FUNCTION_KEY}`,
        },
        body: JSON.stringify({ 
          planId: plan.id,
          stripePlanId: plan.stripe_plan_id,
          userId: user.id,
          billingDetails,
          returnUrl: returnUrl,
        }),
      });

      const response = await fetch(`${EDGE_FUNCTION_URL}/functions/v1/create-subscription`, fetchOptions);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create subscription');
      }

      const { clientSecret, subscriptionId, customerId } = await response.json();

      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Card element not found');
      }

      const confirmPaymentOptions = {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: billingDetails.name,
            email: billingDetails.email,
            address: {
              line1: billingDetails.address.line1,
              city: billingDetails.address.city,
              state: billingDetails.address.state,
              postal_code: billingDetails.address.postal_code,
              country: billingDetails.address.country,
            }
          }
        },
        return_url: returnUrl,
      };

      const { error: paymentError, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret, 
        confirmPaymentOptions
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

      const confirmOptions = applySafeCookieParams({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${EDGE_FUNCTION_KEY}`,
        },
        body: JSON.stringify({ 
          subscriptionId,
          customerId,
          userId: user.id,
          planId: plan.id,
          paymentIntentId: paymentIntent?.id
        }),
      });

      const confirmResponse = await fetch(`${EDGE_FUNCTION_URL}/functions/v1/confirm-subscription`, confirmOptions);

      if (!confirmResponse.ok) {
        const errorData = await confirmResponse.json();
        throw new Error(errorData.error || 'Failed to confirm subscription');
      }

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

  const hasFieldError = (fieldName: string) => {
    return fieldName in fieldErrors;
  };

  React.useEffect(() => {
    Object.entries(fieldErrors).forEach(([field, message]) => {
      if (field !== 'card') {
        const inputField = document.getElementById(field);
        if (inputField) {
          inputField.classList.add('border-destructive', 'focus-visible:ring-destructive');
        }
      }
    });
  }, [fieldErrors]);

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
