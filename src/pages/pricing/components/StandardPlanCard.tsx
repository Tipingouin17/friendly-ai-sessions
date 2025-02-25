
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Plan } from "../types";

interface StandardPlanCardProps {
  plan: Plan;
}

export const StandardPlanCard = ({ plan }: StandardPlanCardProps) => (
  <div 
    className={`glass-card p-8 rounded-2xl hover-lift relative ${
      plan.is_popular ? 'ring-2 ring-primary' : ''
    }`}
  >
    {plan.is_popular && (
      <div className="absolute -top-4 left-1/2 -translate-x-1/2">
        <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
          Most Popular
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
      variant={plan.is_popular ? "default" : "outline"}
    >
      Get Started
    </Button>
  </div>
);
