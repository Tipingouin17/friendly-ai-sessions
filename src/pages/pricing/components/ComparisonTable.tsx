import { Plan, FEATURE_LABELS, allFeatures } from "../types";
import { PricingFeatureValue } from "./PricingFeatureValue";
import { useUserPlan } from "@/hooks/useUserPlan";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { InfoIcon, DollarSign, Euro, PoundSterling, Infinity } from "lucide-react";

interface ComparisonTableProps {
  plans: Plan[];
}

export const ComparisonTable = ({
  plans
}: ComparisonTableProps) => {
  const {
    currentPlanId,
    planRestrictions
  } = useUserPlan();

  // Helper function to determine if a feature is particularly important to highlight
  const isHighlightedFeature = (feature: string) => {
    return ['facilitator_limit', 'session_limit'].includes(feature);
  };

  // Helper function to get tooltip content for each feature
  const getTooltipContent = (feature: string) => {
    switch (feature) {
      case 'facilitator_limit':
        return "The maximum number of AI facilitators you can create or use in your account. Each facilitator can conduct different types of workshops.";
      case 'session_limit':
        return "The maximum number of workshop sessions you can create per month.";
      case 'max_participants':
        return "The maximum number of participants allowed in each session.";
      case 'question_limit':
        return "The maximum number of questions participants can ask per session.";
      case 'customisable_sessions':
        return "Create and customize your own workshop sessions with custom agendas and topics.";
      case 'customisable_facilitators':
        return "Customize AI facilitators with unique personalities, expertise, and facilitation styles.";
      case 'saved_sessions':
        return "Save sessions to review or continue later.";
      case 'session_reports':
        return "Generate detailed reports after each session with insights and analytics.";
      case 'data_export':
        return "Export your session data in various formats for analysis.";
      case 'priority_support':
        return "Get priority access to customer support with faster response times.";
      case 'custom_branding':
        return "Add your own branding, logos, and colors to the platform.";
      default:
        return "";
    }
  };

  // Helper function to safely access properties from plan table details
  const getFeatureValue = (plan: Plan, feature: string) => {
    if (!plan.plan_table_details) return null;

    // Access the feature value directly from plan_table_details object
    const value = (plan.plan_table_details as Record<string, any>)[feature];

    // If the value is a number and greater than 999999, return 'unlimited'
    if (typeof value === 'number' && value > 999999) {
      return 'unlimited';
    }
    return value;
  };

  // Function to determine if a plan should be highlighted as popular - use ONLY is_popular flag
  const isPlanPopular = (plan: Plan) => {
    return plan.is_popular;
  };

  // Get appropriate currency icon based on plan currency
  const getCurrencyIcon = (currency: string) => {
    switch (currency.toUpperCase()) {
      case 'EUR':
        return <Euro className="h-4 w-4 text-primary inline" />;
      case 'GBP':
        return <PoundSterling className="h-4 w-4 text-primary inline" />;
      case 'USD':
      default:
        return <DollarSign className="h-4 w-4 text-primary inline" />;
    }
  };

  // Format price with currency
  const formatPrice = (plan: Plan) => {
    // Enterprise plan (id 4) has custom pricing
    if (plan.id === 4) return "Custom Pricing";

    // Free plan
    if (plan.price === 0) return "Free";

    // Return formatted price (no division by 100)
    return plan.price.toString();
  };

  return <div className="mt-16">
    <h2 className="text-3xl font-bold text-center mb-8">Compare Plans</h2>
    <div className="overflow-x-auto rounded-lg border shadow-sm">
      <table className="w-full border-collapse bg-white">
        <thead>
          <tr className="border-b">
            <th className="py-4 px-6 text-left font-medium text-gray-500 bg-gray-50">Features</th>
            {plans.map(plan => <th key={plan.id} className={`py-4 px-6 text-center font-medium ${isPlanPopular(plan) ? 'bg-primary/5' : 'bg-gray-50'} ${plan.id === currentPlanId ? 'bg-green-100' : ''}`}>
              <span className="block text-lg font-semibold text-gray-900 text-center">{plan.title}</span>
              {plan.price === 0 ? <span className="block text-sm text-gray-500 mt-1 text-center">Free</span> : plan.id === 4 ? <span className="block text-sm text-gray-500 mt-1">Custom Pricing</span> : <div className="text-sm text-gray-500 mt-1 flex items-center justify-center">
                {getCurrencyIcon(plan.currency || 'USD')}
                <span className="ml-1">{formatPrice(plan)}</span>
                <span className="ml-1">/month</span>
              </div>}
              {plan.id === currentPlanId && <span className="inline-block bg-green-500 text-white text-xs px-2 py-1 rounded mt-1">
                Current
              </span>}
            </th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {allFeatures.map(feature => <tr key={feature} className={`hover:bg-gray-50 ${isHighlightedFeature(feature) ? 'bg-gray-50' : ''}`}>
            <td className="py-4 px-6 text-sm font-medium text-gray-900">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 cursor-help">
                      {FEATURE_LABELS[feature]}
                      <InfoIcon className="h-4 w-4 text-gray-400" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>{getTooltipContent(feature)}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </td>
            {plans.map(plan => {
              // Highlight the cell if it's the current plan and this is a highlighted feature
              const isCurrentPlanFeature = plan.id === currentPlanId && isHighlightedFeature(feature);

              // Get the feature value from the plan's table details
              const featureValue = getFeatureValue(plan, feature);

              // Add current usage info for important metrics in the current plan
              let usageInfo = null;
              if (plan.id === currentPlanId && feature === 'facilitator_limit' && planRestrictions) {
                const facilitatorValue = getFeatureValue(plan, 'facilitator_limit');
                if (typeof facilitatorValue === 'number' || facilitatorValue === 'unlimited') {
                  usageInfo = "Current: Used in Facilitator Setup";
                }
              } else if (plan.id === currentPlanId && feature === 'session_limit' && planRestrictions) {
                const sessionsValue = getFeatureValue(plan, 'session_limit');
                if (typeof sessionsValue === 'number' || sessionsValue === 'unlimited') {
                  usageInfo = "Current: Used in Workshop Creation";
                }
              }
              return <td key={`${plan.id}-${feature}`} className={`py-4 px-6 text-sm text-center ${isPlanPopular(plan) ? 'bg-primary/5' : ''} ${isCurrentPlanFeature ? 'bg-green-100 font-medium' : plan.id === currentPlanId ? 'bg-green-50' : ''}`}>
                <div className="flex flex-col items-center">
                  <PricingFeatureValue value={featureValue} />
                  {usageInfo && <span className="text-xs text-gray-500 mt-1">{usageInfo}</span>}
                </div>
              </td>;
            })}
          </tr>)}
        </tbody>
      </table>
    </div>
  </div>;
};
