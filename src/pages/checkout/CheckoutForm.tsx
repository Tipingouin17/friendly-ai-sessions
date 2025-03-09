import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2, DollarSign, Euro, PoundSterling } from 'lucide-react';
import { EDGE_FUNCTION_URL, EDGE_FUNCTION_KEY } from '@/integrations/supabase/client';
import { CheckoutFormProps } from './types';
import { supabase } from '@/integrations/supabase/client';
import { createSafeUrl } from '@/utils/crossOriginUtils';

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

  const formatPrice = (price: number, currency: string = 'USD') => {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
    return formatter.format(price);
  };

  const CurrencyIcon = () => {
    const currency = plan.currency?.toUpperCase() || 'USD';
    switch (currency) {
      case 'EUR':
        return <Euro className="h-4 w-4 mr-1" />;
      case 'GBP':
        return <PoundSterling className="h-4 w-4 mr-1" />;
      case 'USD':
      default:
        return <DollarSign className="h-4 w-4 mr-1" />;
    }
  };

  const formattedPrice = formatPrice(plan.price, plan.currency);

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

      const response = await fetch(`${EDGE_FUNCTION_URL}/functions/v1/create-subscription`, {
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
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create subscription');
      }

      const { clientSecret, subscriptionId, customerId } = await response.json();

      const confirmPaymentOptions = {
        payment_method: {
          card: elements.getElement(CardElement)!,
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

      const confirmResponse = await fetch(`${EDGE_FUNCTION_URL}/functions/v1/confirm-subscription`, {
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
        credentials: 'include',
      });

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

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
      {Object.keys(fieldErrors).length > 0 && Object.keys(fieldErrors).some(key => key !== 'card') && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please correct the highlighted fields below.
          </AlertDescription>
        </Alert>
      )}
      
      {Object.entries(fieldErrors).map(([field, message]) => {
        if (field !== 'card') {
          const inputField = document.getElementById(field);
          if (inputField) {
            inputField.classList.add('border-destructive', 'focus-visible:ring-destructive');
          }
        }
        return null;
      })}

      <div className="p-4 border rounded-lg">
        <Label htmlFor="card-element" className="text-left block mb-2">
          Card Details <span className="text-destructive">*</span>
        </Label>
        <div className={`p-4 border rounded-md bg-white ${hasFieldError('card') ? 'border-destructive ring-2 ring-destructive' : ''}`}>
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
        {hasFieldError('card') && (
          <p className="mt-1 text-sm text-destructive">{fieldErrors['card']}</p>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-3 pt-2">
        <Button 
          type="submit" 
          disabled={loading}
          className="w-full py-6"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing payment...
            </>
          ) : (
            <>Complete purchase - {formattedPrice}/month</>
          )}
        </Button>
        
        <Button 
          type="button"
          variant="outline" 
          onClick={onCancel}
          disabled={loading}
          className="w-full"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
};
