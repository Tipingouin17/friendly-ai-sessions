
import { Check, DollarSign, Euro, PoundSterling } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Plan } from "../types";
import { useNavigate } from "react-router-dom";

interface StandardPlanCardProps {
  plan: Plan;
  isCurrentPlan?: boolean;
}

export const StandardPlanCard = ({ plan, isCurrentPlan = false }: StandardPlanCardProps) => {
  const navigate = useNavigate();
  
  const handleGetStarted = () => {
    // If it's the current plan, navigate to profile
    if (isCurrentPlan) {
      navigate('/profile');
    } else if (plan.price === 0) {
      // For free plan, update directly (in a real app, this would go through an API)
      navigate(`/checkout?plan=${plan.id}`);
    } else {
      // For paid plans, redirect to checkout
      navigate(`/checkout?plan=${plan.id}`);
    }
  };
  
  // Get appropriate currency icon based on plan currency
  const getCurrencyIcon = (currency: string) => {
    switch (currency.toUpperCase()) {
      case 'EUR':
        return <Euro className="h-6 w-6 text-primary inline mr-1" />;
      case 'GBP':
        return <PoundSterling className="h-6 w-6 text-primary inline mr-1" />;
      case 'USD':
      default:
        return <DollarSign className="h-6 w-6 text-primary inline mr-1" />;
    }
  };
  
  // Format the price with correct currency symbol and decimal places
  const formatPrice = (price: number) => {
    if (price === 0) return '0';
    
    // Extract currency information from plan metadata or default to USD
    const currency = plan.currency || 'USD';
    
    // Format price with appropriate currency symbol
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
    
    // Return formatted value without the currency code
    return formatter.format(price / 100).replace(/[A-Z]{3}/, '').trim();
  };
  
  // Determine if this plan should be highlighted as popular
  // Basic plan (id=2) should be highlighted as popular by default
  const isPlanPopular = plan.is_popular || plan.id === 2;
  
  return (
    <div 
      className={`glass-card p-8 rounded-2xl hover-lift relative ${
        isPlanPopular ? 'ring-2 ring-primary' : ''
      } ${
        isCurrentPlan ? 'ring-2 ring-green-500' : ''
      }`}
    >
      {isPlanPopular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
            Most Popular
          </span>
        </div>
      )}
      
      {isCurrentPlan && (
        <div className="absolute -top-4 right-4">
          <span className="bg-green-500 text-white px-4 py-1 rounded-full text-sm font-medium">
            Current Plan
          </span>
        </div>
      )}
      
      <h3 className="text-2xl font-bold mb-2">{plan.title}</h3>
      <p className="text-muted-foreground mb-4">{plan.plan_type || `${plan.title} Plan`}</p>
      <div className="mb-6">
        <div className="flex items-center justify-center">
          {plan.price > 0 && getCurrencyIcon(plan.currency || 'USD')}
          <span className="text-4xl font-bold">{formatPrice(plan.price)}</span>
        </div>
        <div className="text-center text-muted-foreground">/month</div>
      </div>
      <ul className="space-y-4 mb-8">
        {(plan.plan_details as string[])?.map((feature, index) => (
          <li key={index} className="flex items-center gap-2">
            <Check className="h-5 w-5 text-primary" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <Button 
        className="w-full" 
        variant={isCurrentPlan ? "outline" : (isPlanPopular ? "default" : "outline")}
        onClick={handleGetStarted}
      >
        {isCurrentPlan ? "Current Plan" : "Get Started"}
      </Button>
    </div>
  );
};
