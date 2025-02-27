
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Plan } from './pricing/types';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Stepper, StepperItem, StepperContent, StepperTrigger, StepperIndicator, StepperTitle, StepperDescription, StepperSeparator } from '@/components/ui/stepper';
import { CardElement, Elements, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, CreditCard, User, Package, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Initialize Stripe (replace with your publishable key)
const stripePromise = loadStripe('pk_test_your_publishable_key');

const Checkout = () => {
  const [searchParams] = useSearchParams();
  const planId = searchParams.get('plan');
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeStep, setActiveStep] = useState(0);
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
      
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('id', numericPlanId)
        .single();
      
      if (error) throw error;
      return data as Plan;
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

  // Next step handler
  const handleNextStep = () => {
    setActiveStep(prev => prev + 1);
  };

  // Previous step handler
  const handlePreviousStep = () => {
    setActiveStep(prev => prev - 1);
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
        <div className="container max-w-3xl mx-auto px-4">
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

  return (
    <div className="min-h-screen pt-24 pb-16 bg-gray-50">
      <div className="container max-w-3xl mx-auto px-4">
        <Button 
          variant="ghost" 
          className="mb-6" 
          onClick={handleBackToPricing}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Pricing
        </Button>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">
              Upgrade to {plan.title} Plan
            </CardTitle>
            <CardDescription className="text-center">
              Complete the following steps to upgrade your subscription
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Stepper 
              value={activeStep.toString()} 
              onValueChange={(value) => setActiveStep(parseInt(value))}
              className="w-full"
            >
              {/* Step 1: Plan Summary */}
              <StepperItem value="0" className="mb-8">
                <StepperTrigger className="flex items-center gap-2">
                  <StepperIndicator>
                    <Package className="h-4 w-4" />
                  </StepperIndicator>
                  <div className="flex flex-col text-left">
                    <StepperTitle>Plan Details</StepperTitle>
                    <StepperDescription>Review your selected plan</StepperDescription>
                  </div>
                </StepperTrigger>
                
                <StepperContent className="mt-4">
                  <div className="space-y-6">
                    <div className="bg-primary/5 p-6 rounded-lg">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold">{plan.title} Plan</h3>
                        <span className="text-2xl font-bold">${plan.price}/mo</span>
                      </div>
                      
                      <ul className="space-y-2">
                        {(plan.plan_details as string[])?.map((feature, index) => (
                          <li key={index} className="flex items-center gap-2">
                            <Check className="h-5 w-5 text-primary" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="flex justify-between">
                      <Button 
                        variant="outline" 
                        onClick={handleBackToPricing}
                      >
                        Cancel
                      </Button>
                      <Button onClick={handleNextStep}>
                        Continue <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </StepperContent>
              </StepperItem>
              
              <StepperSeparator />
              
              {/* Step 2: Billing Information */}
              <StepperItem value="1" className="mb-8">
                <StepperTrigger className="flex items-center gap-2">
                  <StepperIndicator>
                    <User className="h-4 w-4" />
                  </StepperIndicator>
                  <div className="flex flex-col text-left">
                    <StepperTitle>Billing Information</StepperTitle>
                    <StepperDescription>Enter your billing details</StepperDescription>
                  </div>
                </StepperTrigger>
                
                <StepperContent className="mt-4">
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input 
                          id="name" 
                          name="name" 
                          value={billingDetails.name} 
                          onChange={handleBillingDetailsChange} 
                          required 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input 
                          id="email" 
                          name="email" 
                          type="email" 
                          value={billingDetails.email} 
                          onChange={handleBillingDetailsChange} 
                          required 
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="address.line1">Address</Label>
                        <Input 
                          id="address.line1" 
                          name="address.line1" 
                          value={billingDetails.address.line1} 
                          onChange={handleBillingDetailsChange} 
                          required 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="address.city">City</Label>
                        <Input 
                          id="address.city" 
                          name="address.city" 
                          value={billingDetails.address.city} 
                          onChange={handleBillingDetailsChange} 
                          required 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="address.state">State/Province</Label>
                        <Input 
                          id="address.state" 
                          name="address.state" 
                          value={billingDetails.address.state} 
                          onChange={handleBillingDetailsChange} 
                          required 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="address.postal_code">Postal Code</Label>
                        <Input 
                          id="address.postal_code" 
                          name="address.postal_code" 
                          value={billingDetails.address.postal_code} 
                          onChange={handleBillingDetailsChange} 
                          required 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="address.country">Country</Label>
                        <Input 
                          id="address.country" 
                          name="address.country" 
                          value={billingDetails.address.country} 
                          onChange={handleBillingDetailsChange} 
                          required 
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-between">
                      <Button 
                        variant="outline" 
                        onClick={handlePreviousStep}
                      >
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back
                      </Button>
                      <Button onClick={handleNextStep}>
                        Continue <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </StepperContent>
              </StepperItem>
              
              <StepperSeparator />
              
              {/* Step 3: Payment */}
              <StepperItem value="2">
                <StepperTrigger className="flex items-center gap-2">
                  <StepperIndicator>
                    <CreditCard className="h-4 w-4" />
                  </StepperIndicator>
                  <div className="flex flex-col text-left">
                    <StepperTitle>Payment</StepperTitle>
                    <StepperDescription>Complete your subscription</StepperDescription>
                  </div>
                </StepperTrigger>
                
                <StepperContent className="mt-4">
                  <Elements stripe={stripePromise}>
                    <CheckoutForm 
                      plan={plan}
                      billingDetails={billingDetails}
                      onBack={handlePreviousStep}
                    />
                  </Elements>
                </StepperContent>
              </StepperItem>
            </Stepper>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Checkout Form with Stripe integration
const CheckoutForm = ({ 
  plan, 
  billingDetails,
  onBack 
}: { 
  plan: Plan; 
  billingDetails: any;
  onBack: () => void;
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);
    setError(null);

    // Create a payment method using the card element
    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setError("Payment form not loaded properly. Please refresh and try again.");
      setLoading(false);
      return;
    }

    try {
      // In a real implementation, we would:
      // 1. Call a Supabase Edge Function to create a PaymentIntent on the server
      // 2. Confirm the payment on the client side
      // 3. Update the user's subscription in the database

      // For now, we'll simulate a successful payment
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Update the user's plan in the database
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ current_plan_id: plan.id })
        .eq('id', user?.id);

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: `You've successfully upgraded to the ${plan.title} plan!`,
      });

      // Navigate to profile page
      navigate('/profile');
      
    } catch (err) {
      console.error('Payment error:', err);
      setError(typeof err === 'string' ? err : 'An error occurred during payment processing. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="p-4 border rounded-lg">
        <h3 className="font-medium mb-4">Payment Information</h3>
        
        <div className="p-4 border rounded-md bg-white">
          <CardElement 
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
      </div>

      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex justify-between mb-2">
          <span>Plan</span>
          <span>{plan.title}</span>
        </div>
        <div className="flex justify-between mb-2">
          <span>Billing</span>
          <span>Monthly</span>
        </div>
        <div className="flex justify-between border-t pt-2 mt-2 font-bold">
          <span>Total</span>
          <span>${plan.price}/month</span>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg">
          {error}
        </div>
      )}

      <div className="flex justify-between">
        <Button 
          type="button"
          variant="outline" 
          onClick={onBack}
          disabled={loading}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Button 
          type="submit" 
          disabled={!stripe || loading}
          className="min-w-32"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>Pay ${plan.price}</>
          )}
        </Button>
      </div>
    </form>
  );
};

export default Checkout;
