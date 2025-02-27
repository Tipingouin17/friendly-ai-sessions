
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Plan } from "../types";
import { useNavigate } from "react-router-dom";
import { useUserPlan } from "@/hooks/useUserPlan";

interface StandardPlanCardProps {
  plan: Plan;
  isCurrentPlan?: boolean;
}

export const StandardPlanCard = ({ plan, isCurrentPlan = false }: StandardPlanCardProps) => {
  const navigate = useNavigate();
  const { currentPlanId } = useUserPlan();
  
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
  
  return (
    <div 
      className={`glass-card p-8 rounded-2xl hover-lift relative ${
        plan.is_popular ? 'ring-2 ring-primary' : ''
      } ${
        isCurrentPlan ? 'ring-2 ring-green-500' : ''
      }`}
    >
      {plan.is_popular && (
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
      <p className="text-muted-foreground mb-4">{plan.plan_type}</p>
      <div className="mb-6">
        <span className="text-4xl font-bold">${plan.price}</span>
        <span className="text-muted-foreground">/month</span>
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
        variant={isCurrentPlan ? "outline" : (plan.is_popular ? "default" : "outline")}
        onClick={handleGetStarted}
      >
        {isCurrentPlan ? "Current Plan" : "Get Started"}
      </Button>
    </div>
  );
};
