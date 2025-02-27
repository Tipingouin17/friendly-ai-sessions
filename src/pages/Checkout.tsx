
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Plan } from './pricing/types';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { CardElement, Elements, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, CreditCard, User, Package, ArrowLeft, ArrowRight, Loader2, Shield } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

// Initialize Stripe (replace with your publishable key)
const stripePromise = loadStripe('pk_test_your_publishable_key');

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
                <CardTitle className="text-2xl font-bold">
                  Complete Your Order
                </CardTitle>
                <CardDescription>
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
                        {(plan.plan_details as string[])?.map((feature, index) => (
                          <li key={index} className="flex items-center gap-2">
                            <Check className="h-5 w-5 text-primary flex-shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* Billing Information Section */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <User className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-semibold">Billing Information</h3>
                    </div>
                    
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
                  </div>
                  
                  <Separator />
                  
                  {/* Payment Information Section */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <CreditCard className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-semibold">Payment Method</h3>
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
                  <CardTitle>Order Summary</CardTitle>
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 border rounded-lg">
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

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg">
          {error}
        </div>
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
