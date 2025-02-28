
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase, EDGE_FUNCTION_URL, EDGE_FUNCTION_KEY } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Plan } from './pricing/types';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { CardElement, Elements, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, CreditCard, User, Package, ArrowLeft, ArrowRight, Loader2, Shield, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Initialize Stripe with a valid publishable key
// Using a valid Stripe test publishable key format
const stripePromise = loadStripe('pk_test_51OcXwYGWmQRsACOr1hLGJ9uYXTPTilQwhNFZcC6jtXPMkj00jUPbIQgxOjXZkmKn1cPDZpIhNKGGPHuFJtVqelZ500vbDgQTDl', {
  stripeAccount: undefined, // Make sure no connected account is specified
});

const Checkout = () => {
  const [searchParams] = useSearchParams();
  const planId = searchParams.get('plan');
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [billingDetails, setBillingDetails] = useState({
    name: '',
    email: user?.email || '',
    address: {
      line1: '',
      city: '',
      state: '',
      postal_code: '',
      country: '',
    },
  });

  // Fetch plan details
  const { data: plan, isLoading: planLoading, error: planError } = useQuery({
    queryKey: ['checkout-plan', planId],
    queryFn: async () => {
      if (!planId) throw new Error('No plan selected');
      
      // Convert planId from string to number before passing it to the query
      const numericPlanId = parseInt(planId, 10);
      if (isNaN(numericPlanId)) throw new Error('Invalid plan ID');
      
      // Query the plan_features view instead of the plans table
      const { data, error } = await supabase
        .from('plan_features')
        .select('*')
        .eq('id', numericPlanId)
        .single();
      
      if (error) throw error;
      
      // Process the data to match our Plan type
      const processedPlan: Plan = {
        id: data.id,
        title: data.title,
        price: data.price || 0,
        plan_type: data.plan_type,
        plan_table_details: {
          no_of_facilitator: data.no_of_facilitator,
          no_of_sessions: data.no_of_sessions,
          max_participants: data.max_participants,
          customisable_sessions: data.customisable_sessions,
          customisable_facilitators: data.customisable_facilitators,
          saved_sessions: data.saved_sessions,
          session_reports: data.session_reports,
          data_export: data.data_export
        },
        is_popular: data.is_popular,
        stripe_plan_id: data.stripe_plan_id,
        currency: data.currency
      };
      
      return processedPlan;
    },
  });

  // Handle back to pricing
  const handleBackToPricing = () => {
    navigate('/pricing');
  };

  // Update billing details
  const handleBillingDetailsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setBillingDetails(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof typeof prev] as object,
          [child]: value
        }
      }));
    } else {
      setBillingDetails(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // If no plan is selected, redirect back to pricing
  useEffect(() => {
    if (!planId) {
      toast({
        title: "Error",
        description: "Please select a plan first",
        variant: "destructive",
      });
      navigate('/pricing');
    }
  }, [planId, navigate, toast]);

  // Loading state
  if (planLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading checkout...</span>
      </div>
    );
  }

  // Error state
  if (planError || !plan) {
    return (
      <div className="min-h-screen pt-24 pb-16">
        <div className="container max-w-6xl mx-auto px-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-center">Error</CardTitle>
              <CardDescription className="text-center">
                We couldn't load the plan details. Please try again.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button onClick={handleBackToPricing} className="w-full">
                Back to Pricing
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  // Generate feature list based on plan table details
  const getFeatureList = () => {
    if (!plan.plan_table_details) return [];
    
    const features = [];
    
    // Number of facilitators
    if (plan.plan_table_details.no_of_facilitator) {
      const facilitators = plan.plan_table_details.no_of_facilitator === 'unlimited' 
        ? 'Unlimited facilitators' 
        : `${plan.plan_table_details.no_of_facilitator} facilitators`;
      features.push(facilitators);
    }
    
    // Number of sessions
    if (plan.plan_table_details.no_of_sessions) {
      const sessions = plan.plan_table_details.no_of_sessions === 'unlimited' 
        ? 'Unlimited sessions per month' 
        : `${plan.plan_table_details.no_of_sessions} sessions per month`;
      features.push(sessions);
    }
    
    // Max participants
    if (plan.plan_table_details.max_participants) {
      const participants = plan.plan_table_details.max_participants === 'unlimited' 
        ? 'Unlimited participants per session' 
        : `Up to ${plan.plan_table_details.max_participants} participants per session`;
      features.push(participants);
    }
    
    // Customizable sessions
    if (plan.plan_table_details.customisable_sessions) {
      features.push('Create customized sessions');
    }
    
    // Saved sessions
    if (plan.plan_table_details.saved_sessions) {
      features.push('Save sessions for later');
    }
    
    // Session reports
    if (plan.plan_table_details.session_reports) {
      features.push('Detailed session reports');
    }
    
    // Data export
    if (plan.plan_table_details.data_export) {
      features.push('Export session data');
    }
    
    return features;
  };

  const planFeatures = getFeatureList();

  // Helper for required field label
  const RequiredLabel = ({ htmlFor, children }: { htmlFor: string, children: React.ReactNode }) => (
    <Label htmlFor={htmlFor} className="text-left block">
      {children} <span className="text-destructive">*</span>
    </Label>
  );

  return (
    <div className="min-h-screen pt-16 pb-16 bg-gray-50">
      <div className="container max-w-6xl mx-auto px-4">
        <Button 
          variant="ghost" 
          className="mb-6" 
          onClick={handleBackToPricing}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Pricing
        </Button>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column: Plan details and summary */}
          <div className="lg:col-span-2">
            <Card className="mb-8">
              <CardHeader className="border-b">
                <CardTitle className="text-2xl font-bold text-left">
                  Complete Your Order
                </CardTitle>
                <CardDescription className="text-left">
                  You're upgrading to the {plan.title} Plan
                </CardDescription>
              </CardHeader>
              
              <CardContent className="pt-6">
                <div className="space-y-8">
                  {/* Plan Details Section */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Package className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-semibold">Plan Details</h3>
                    </div>
                    
                    <div className="bg-primary/5 p-6 rounded-lg">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold">{plan.title} Plan</h3>
                        <span className="text-2xl font-bold">${plan.price}/mo</span>
                      </div>
                      
                      <ul className="space-y-2">
                        {planFeatures.map((feature, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* Billing Information Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <User className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-semibold">Billing Information</h3>
                      <span className="text-sm text-muted-foreground">(Fields marked with <span className="text-destructive">*</span> are required)</span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div className="space-y-2">
                        <RequiredLabel htmlFor="name">Full Name</RequiredLabel>
                        <Input 
                          id="name" 
                          name="name" 
                          value={billingDetails.name} 
                          onChange={handleBillingDetailsChange} 
                          required 
                          className="text-left"
                          aria-required="true"
                        />
                      </div>
                      <div className="space-y-2">
                        <RequiredLabel htmlFor="email">Email</RequiredLabel>
                        <Input 
                          id="email" 
                          name="email" 
                          type="email" 
                          value={billingDetails.email} 
                          onChange={handleBillingDetailsChange} 
                          required 
                          className="text-left"
                          aria-required="true"
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <RequiredLabel htmlFor="address.line1">Address</RequiredLabel>
                        <Input 
                          id="address.line1" 
                          name="address.line1" 
                          value={billingDetails.address.line1} 
                          onChange={handleBillingDetailsChange} 
                          required 
                          className="text-left"
                          aria-required="true"
                        />
                      </div>
                      <div className="space-y-2">
                        <RequiredLabel htmlFor="address.city">City</RequiredLabel>
                        <Input 
                          id="address.city" 
                          name="address.city" 
                          value={billingDetails.address.city} 
                          onChange={handleBillingDetailsChange} 
                          required 
                          className="text-left"
                          aria-required="true"
                        />
                      </div>
                      <div className="space-y-2">
                        <RequiredLabel htmlFor="address.state">State/Province</RequiredLabel>
                        <Input 
                          id="address.state" 
                          name="address.state" 
                          value={billingDetails.address.state} 
                          onChange={handleBillingDetailsChange} 
                          required 
                          className="text-left"
                          aria-required="true"
                        />
                      </div>
                      <div className="space-y-2">
                        <RequiredLabel htmlFor="address.postal_code">Postal Code</RequiredLabel>
                        <Input 
                          id="address.postal_code" 
                          name="address.postal_code" 
                          value={billingDetails.address.postal_code} 
                          onChange={handleBillingDetailsChange} 
                          required 
                          className="text-left"
                          aria-required="true"
                        />
                      </div>
                      <div className="space-y-2">
                        <RequiredLabel htmlFor="address.country">Country</RequiredLabel>
                        <Input 
                          id="address.country" 
                          name="address.country" 
                          value={billingDetails.address.country} 
                          onChange={handleBillingDetailsChange} 
                          required 
                          className="text-left"
                          aria-required="true"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* Payment Information Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-semibold">Payment Method</h3>
                      <span className="text-sm text-muted-foreground">(Required)</span>
                    </div>
                    
                    <Elements stripe={stripePromise}>
                      <CheckoutForm 
                        plan={plan}
                        billingDetails={billingDetails}
                        onCancel={handleBackToPricing}
                      />
                    </Elements>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Right column: Order summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <Card>
                <CardHeader className="border-b">
                  <CardTitle className="text-left">Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>{plan.title} Plan</span>
                      <span>${plan.price}/mo</span>
                    </div>
                    
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Billing</span>
                      <span>Monthly</span>
                    </div>
                    
                    <Separator />
                    
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total</span>
                      <span>${plan.price}/month</span>
                    </div>
                    
                    <div className="pt-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                        <Shield className="h-4 w-4" />
                        <span>Secure payment processing</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Your payment information is encrypted and secure. We never store your full credit card details.
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Checkout Form with Stripe integration
const CheckoutForm = ({ 
  plan, 
  billingDetails,
  onCancel 
}: { 
  plan: Plan; 
  billingDetails: any;
  onCancel: () => void;
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

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
            <>Complete purchase - ${plan.price}/month</>
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

export default Checkout;
