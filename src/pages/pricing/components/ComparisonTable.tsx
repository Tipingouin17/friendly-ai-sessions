
import { Plan, FEATURE_LABELS, allFeatures } from "../types";
import { PricingFeatureValue } from "./PricingFeatureValue";
import { useUserPlan } from "@/hooks/useUserPlan";

interface ComparisonTableProps {
  plans: Plan[];
}

export const ComparisonTable = ({ plans }: ComparisonTableProps) => {
  const { currentPlanId } = useUserPlan();
  
  return (
    <div className="mt-16">
      <h2 className="text-3xl font-bold text-center mb-8">Compare Plans</h2>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full border-collapse bg-white">
          <thead>
            <tr className="border-b">
              <th className="py-4 px-6 text-left font-medium text-gray-500 bg-gray-50">Features</th>
              {plans.map((plan) => (
                <th 
                  key={plan.id} 
                  className={`py-4 px-6 text-center font-medium ${
                    plan.is_popular ? 'bg-primary/5' : 'bg-gray-50'
                  } ${
                    plan.id === currentPlanId ? 'bg-green-100' : ''
                  }`}
                >
                  <span className="block text-lg font-semibold text-gray-900">{plan.title}</span>
                  <span className="block text-sm text-gray-500 mt-1">
                    {plan.title === "Enterprise" ? "Custom Pricing" : `$${plan.price}/month`}
                  </span>
                  {plan.id === currentPlanId && (
                    <span className="inline-block bg-green-500 text-white text-xs px-2 py-1 rounded mt-1">
                      Current
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {allFeatures.map((feature) => (
              <tr key={feature} className="hover:bg-gray-50">
                <td className="py-4 px-6 text-sm font-medium text-gray-900">
                  {FEATURE_LABELS[feature]}
                </td>
                {plans.map((plan) => (
                  <td 
                    key={`${plan.id}-${feature}`} 
                    className={`py-4 px-6 text-sm text-center ${
                      plan.is_popular ? 'bg-primary/5' : ''
                    } ${
                      plan.id === currentPlanId ? 'bg-green-100' : ''
                    }`}
                  >
                    <PricingFeatureValue value={plan.plan_table_details?.[feature]} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
