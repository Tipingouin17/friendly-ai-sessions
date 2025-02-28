
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

  // Format price with correct currency symbol
  const formatPrice = (price: number, currency: string = 'USD') => {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
    return formatter.format(price);
  };

  // Get appropriate currency icon
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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    // Debug information
    console.log("Stripe loaded?", !!stripe);
    console.log("Elements loaded?", !!elements);

    if (!stripe || !elements) {
      setError("Stripe has not loaded properly. Please refresh the page and try again.");
      return;
    }

    if (!user) {
      setError("You must be logged in to complete this purchase.");
      return;
    }

    // Clear previous errors
    setError(null);
    setFieldErrors({});
    
    // Validate form fields
    const newFieldErrors: Record<string, string> = {};
    
    // Check for empty required fields
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
    
    // Check if card details are filled
    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      newFieldErrors['card'] = "Payment form not loaded properly";
    }
    
    // If there are field errors, show them and return
    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      
      // Scroll to the first error field
      const firstErrorField = Object.keys(newFieldErrors)[0];
      const errorElement = document.getElementById(firstErrorField);
      if (errorElement) {
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        errorElement.focus();
      }
      
      // Show toast for form validation errors
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
      
      // For testing only - display a mock successful payment instead of real Stripe API
      // Remove this in production
      console.log("⚠️ Using mock payment flow for testing");
      toast({
        title: "Success",
        description: `You've successfully subscribed to the ${plan.title} plan!`,
      });
      
      // Navigate to profile page
      navigate('/profile');
      return;
      
      // Step 1: Create a subscription via the Supabase Edge Function
      const response = await fetch(`${EDGE_FUNCTION_URL}/functions/v1/create-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${EDGE_FUNCTION_KEY}`,
        },
        body: JSON.stringify({ 
          planId: plan.id,
          stripePlanId: plan.stripe_plan_id, // Make sure to include the Stripe plan ID
          userId: user.id,
          billingDetails,
          returnUrl: window.location.origin + '/profile',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create subscription');
      }

      const { clientSecret, subscriptionId, customerId } = await response.json();

      // Step 2: Confirm the payment with Stripe
      const { error: paymentError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
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
        }
      });

      if (paymentError) {
        // If it's a card error, it's likely due to the card details
        if (paymentError.type === 'card_error') {
          setFieldErrors({ card: paymentError.message || 'Card error' });
          
          // Scroll to card element
          const cardContainer = document.querySelector('.p-4.border.rounded-md.bg-white');
          if (cardContainer) {
            cardContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
        
        throw new Error(paymentError.message || 'Payment failed');
      }

      // Step 3: Confirm the subscription with our backend
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
      });

      if (!confirmResponse.ok) {
        const errorData = await confirmResponse.json();
        throw new Error(errorData.error || 'Failed to confirm subscription');
      }

      // Successfully subscribed
      toast({
        title: "Success",
        description: `You've successfully subscribed to the ${plan.title} plan!`,
      });

      // Navigate to profile page
      navigate('/profile');
      
    } catch (err: any) {
      console.error('Payment error:', err);
      setError(err.message || 'An error occurred during payment processing. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Helper to determine if a specific field has error
  const hasFieldError = (fieldName: string) => {
    return fieldName in fieldErrors;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
      {/* Field error indicators for billing details section */}
      {Object.keys(fieldErrors).length > 0 && Object.keys(fieldErrors).some(key => key !== 'card') && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please correct the highlighted fields below.
          </AlertDescription>
        </Alert>
      )}
      
      {/* Display field errors under each input field */}
      {Object.entries(fieldErrors).map(([field, message]) => {
        // Only show errors for fields other than 'card' here
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

      {/* General error alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-3 pt-2">
        <Button 
          type="submit" 
          disabled={!stripe || loading}
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
