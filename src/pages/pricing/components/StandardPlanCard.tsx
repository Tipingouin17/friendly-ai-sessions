
import { Check, DollarSign, Euro, PoundSterling } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Plan, FEATURE_LABELS } from "../types";
import { useNavigate } from "react-router-dom";
interface StandardPlanCardProps {
  plan: Plan;
  isCurrentPlan?: boolean;
}
export const StandardPlanCard = ({
  plan,
  isCurrentPlan = false
}: StandardPlanCardProps) => {
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

  // Get the currency symbol only
  const getCurrencySymbol = (currency: string) => {
    switch (currency.toUpperCase()) {
      case 'EUR':
        return '€';
      case 'GBP':
        return '£';
      case 'USD':
      default:
        return '$';
    }
  };

  // Format price in a clean way for the large display
  const formatDisplayPrice = (price: number) => {
    if (price === 0) return 'Free';
    
    // No conversion - display the price as is (already in dollars/euros)
    const formattedPrice = price;
    
    // Return with 2 decimal places if it has decimals, otherwise as integer
    return Number.isInteger(formattedPrice) 
      ? formattedPrice.toString() 
      : formattedPrice.toFixed(2);
  };

  // Determine if this plan should be highlighted as popular
  // Basic plan (id=2) should be highlighted as popular by default
  const isPlanPopular = plan.is_popular || plan.id === 2;

  // Generate feature list based on plan features instead of plan_details
  const getFeatureList = () => {
    if (!plan.plan_table_details) return [];
    const features = [];

    // Number of facilitators
    if (plan.plan_table_details.no_of_facilitator) {
      // Check if it's a numeric value greater than 999999 or explicitly "unlimited"
      const isUnlimited = 
        (typeof plan.plan_table_details.no_of_facilitator === 'number' && 
         plan.plan_table_details.no_of_facilitator > 999999) || 
        plan.plan_table_details.no_of_facilitator === 'unlimited';
        
      const facilitators = isUnlimited 
        ? 'Unlimited facilitators' 
        : `${plan.plan_table_details.no_of_facilitator} facilitators`;
      features.push(facilitators);
    }

    // Number of sessions
    if (plan.plan_table_details.no_of_sessions) {
      // Check if it's a numeric value greater than 999999 or explicitly "unlimited"
      const isUnlimited = 
        (typeof plan.plan_table_details.no_of_sessions === 'number' && 
         plan.plan_table_details.no_of_sessions > 999999) || 
        plan.plan_table_details.no_of_sessions === 'unlimited';
        
      const sessions = isUnlimited
        ? 'Unlimited sessions per month' 
        : `${plan.plan_table_details.no_of_sessions} sessions per month`;
      features.push(sessions);
    }

    // Max participants
    if (plan.plan_table_details.max_participants) {
      // Check if it's a numeric value greater than 999999 or explicitly "unlimited"
      const isUnlimited = 
        (typeof plan.plan_table_details.max_participants === 'number' && 
         plan.plan_table_details.max_participants > 999999) || 
        plan.plan_table_details.max_participants === 'unlimited';
        
      const participants = isUnlimited
        ? 'Unlimited participants per session' 
        : `Up to ${plan.plan_table_details.max_participants} participants per session`;
      features.push(participants);
    }
    
    // Number of questions per session
    if (plan.plan_table_details.number_of_questions_per_session) {
      // Check if it's a numeric value greater than 999999 or explicitly "unlimited"
      const isUnlimited = 
        (typeof plan.plan_table_details.number_of_questions_per_session === 'number' && 
         plan.plan_table_details.number_of_questions_per_session > 999999) || 
        plan.plan_table_details.number_of_questions_per_session === 'unlimited';
        
      const questions = isUnlimited
        ? 'Unlimited questions per session' 
        : `Up to ${plan.plan_table_details.number_of_questions_per_session} questions per session`;
      features.push(questions);
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

  // Get features for this plan
  const planFeatures = getFeatureList();
  
  return (
    <div className={`glass-card p-8 rounded-2xl hover-lift relative min-h-[700px] flex flex-col ${isPlanPopular ? 'ring-2 ring-primary' : ''} ${isCurrentPlan ? 'ring-2 ring-green-500' : ''}`}>
      {isPlanPopular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
            Most Popular
          </span>
        </div>
      )}
      
      {isCurrentPlan && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="bg-green-500 text-white px-4 py-1 rounded-full text-sm font-medium">
            Current Plan
          </span>
        </div>
      )}
      
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold mb-2">{plan.title}</h3>
        <p className="text-muted-foreground">{plan.plan_type || `${plan.title} Plan`}</p>
      </div>

      <div className="text-center mb-8">
        {plan.price === 0 ? (
          <div>
            <div className="text-6xl font-bold">Free</div>
            <div className="text-muted-foreground mt-1">/month</div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-center">
              <span className="text-yellow-500 text-2xl mr-1">
                {getCurrencySymbol(plan.currency || 'USD')}
              </span>
              <span className="text-6xl font-bold">{formatDisplayPrice(plan.price)}</span>
            </div>
            <div className="text-muted-foreground mt-1">/month</div>
          </>
        )}
      </div>

      <div className="flex-grow">
        <ul className="space-y-4 text-left">
          {planFeatures.map((feature, index) => (
            <li key={index} className="flex items-start gap-2">
              <Check className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      <Button 
        className={`w-full mt-8 ${isPlanPopular || !isCurrentPlan ? 'bg-yellow-500 hover:bg-yellow-600 text-black' : ''}`} 
        variant={isCurrentPlan ? "outline" : "default"} 
        onClick={handleGetStarted}
      >
        {isCurrentPlan ? "Current Plan" : "Get Started"}
      </Button>
    </div>
  );
};
