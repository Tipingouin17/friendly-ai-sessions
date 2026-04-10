/**
 * Comparison Table
 *
 * Page for the AIfacilitator application.
 */
import { Plan, FEATURE_LABELS, allFeatures } from "../types";
import { PricingFeatureValue } from "./PricingFeatureValue";
import { useUserPlan } from "@/hooks/useUserPlan";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { InfoIcon } from "lucide-react";

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

    const value = (plan.plan_table_details as Record<string, any>)[feature];

    if (typeof value === 'number' && value >= 999999) {
      return 'unlimited';
    }
    return value;
  };

  const isPlanPopular = (plan: Plan) => plan.is_popular;



  const formatPrice = (plan: Plan) => {
    if (plan.id === 4) return "Custom";
    if (plan.price === 0) return "Free";
    return plan.price.toString();
  };

  return (
    <div className="mt-12 md:mt-16">
      <h2 className="text-2xl md:text-3xl font-bold text-center mb-6 md:mb-8">Compare Plans</h2>

      {/* Scroll hint on mobile */}
      <div className="flex items-center justify-center gap-2 mb-3 md:hidden">
        <div className="flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-medium px-3 py-1.5 rounded-full">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          Swipe to compare all plans
        </div>
      </div>

      <div className="relative">
      {/* Right fade shadow to indicate scrollable content */}
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none md:hidden rounded-r-lg" />
      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm -mx-4 sm:mx-0">
        <table className="border-collapse bg-white" style={{ minWidth: '600px', width: '100%' }}>
          <thead>
            <tr className="border-b border-gray-200">
              <th className="py-4 px-4 md:px-6 text-left font-medium text-gray-500 bg-gray-50 w-40 md:w-auto">
                Features
              </th>
              {plans.map(plan => (
                <th
                  key={plan.id}
                  className={`py-4 px-3 md:px-6 text-center font-medium
                    ${isPlanPopular(plan) ? 'bg-primary/5' : 'bg-gray-50'}
                    ${plan.id === currentPlanId ? 'bg-green-50' : ''}
                  `}
                >
                  <span className="block text-sm md:text-base font-semibold text-gray-900 text-center">
                    {plan.title}
                  </span>
                  {plan.price === 0 ? (
                    <span className="block text-xs text-gray-500 mt-1 text-center">Free</span>
                  ) : plan.id === 4 ? (
                    <span className="block text-xs text-gray-500 mt-1 text-center">Custom</span>
                  ) : (
                    <div className="text-xs text-gray-500 mt-1 flex items-center justify-center">
                      <span>{formatPrice(plan)}{plan.currency === 'EUR' ? '€' : plan.currency === 'GBP' ? '£' : '$'}</span>
                      <span className="ml-0.5">/mo</span>
                    </div>
                  )}
                  {plan.id === currentPlanId && (
                    <span className="inline-block bg-green-500 text-white text-xs px-2 py-0.5 rounded mt-1">
                      Current
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {allFeatures.map(feature => (
              <tr
                key={feature}
                className={`hover:bg-gray-50 transition-colors ${isHighlightedFeature(feature) ? 'bg-gray-50/60' : ''}`}
              >
                <td className="py-3 md:py-4 px-4 md:px-6 text-xs md:text-sm font-medium text-gray-900">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1 cursor-help">
                          <span className="leading-snug">{FEATURE_LABELS[feature]}</span>
                          <InfoIcon className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>{getTooltipContent(feature)}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </td>
                {plans.map(plan => {
                  const isCurrentPlanFeature = plan.id === currentPlanId && isHighlightedFeature(feature);
                  const featureValue = getFeatureValue(plan, feature);

                  let usageInfo = null;
                  if (plan.id === currentPlanId && feature === 'facilitator_limit' && planRestrictions) {
                    const facilitatorValue = getFeatureValue(plan, 'facilitator_limit');
                    if (typeof facilitatorValue === 'number' || facilitatorValue === 'unlimited') {
                      usageInfo = "Used in Facilitator Setup";
                    }
                  } else if (plan.id === currentPlanId && feature === 'session_limit' && planRestrictions) {
                    const sessionsValue = getFeatureValue(plan, 'session_limit');
                    if (typeof sessionsValue === 'number' || sessionsValue === 'unlimited') {
                      usageInfo = "Used in Workshop Creation";
                    }
                  }

                  return (
                    <td
                      key={`${plan.id}-${feature}`}
                      className={`py-3 md:py-4 px-3 md:px-6 text-xs md:text-sm text-center
                        ${isPlanPopular(plan) ? 'bg-primary/5' : ''}
                        ${isCurrentPlanFeature ? 'bg-green-100 font-medium' : plan.id === currentPlanId ? 'bg-green-50' : ''}
                      `}
                    >
                      <div className="flex flex-col items-center">
                        <PricingFeatureValue value={featureValue} />
                        {usageInfo && (
                          <span className="text-xs text-gray-400 mt-1 hidden md:block">{usageInfo}</span>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </div>
    </div>
  );
};
