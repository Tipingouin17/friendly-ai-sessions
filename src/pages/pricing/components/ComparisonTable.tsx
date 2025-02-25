
import { Plan, FEATURE_LABELS, allFeatures } from "../types";
import { PricingFeatureValue } from "./PricingFeatureValue";
import { Badge } from "@/components/ui/badge";
import { useMediaQuery } from "@/hooks/use-media-query";

interface ComparisonTableProps {
  plans: Plan[];
}

export const ComparisonTable = ({ plans }: ComparisonTableProps) => {
  const isMobile = useMediaQuery("(max-width: 768px)");

  if (isMobile) {
    return (
      <div className="mt-16">
        <h2 className="text-3xl font-bold text-center mb-8">Compare Plans</h2>
        <div className="space-y-8">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-lg border bg-white ${
                plan.is_popular ? 'ring-2 ring-primary' : ''
              }`}
            >
              <div className="p-6 border-b relative">
                {plan.is_popular && (
                  <Badge className="absolute -top-3 left-6 bg-primary">
                    Most Popular
                  </Badge>
                )}
                <h3 className="text-xl font-semibold text-gray-900">{plan.title}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {plan.title === "Enterprise" ? "Custom Pricing" : `$${plan.price}/month`}
                </p>
              </div>
              <div className="divide-y">
                {allFeatures.map((feature) => (
                  <div
                    key={feature}
                    className="flex justify-between items-center p-4 hover:bg-gray-50"
                  >
                    <span className="text-sm font-medium text-gray-900">
                      {FEATURE_LABELS[feature]}
                    </span>
                    <PricingFeatureValue value={plan.plan_table_details?.[feature]} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-16">
      <h2 className="text-3xl font-bold text-center mb-8">Compare Plans</h2>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full border-collapse bg-white" role="table">
          <thead className="sticky top-0 bg-white z-10 shadow-sm">
            <tr>
              <th 
                scope="col"
                className="py-4 px-6 text-left font-medium text-gray-500 bg-gray-50"
              >
                Features
              </th>
              {plans.map((plan) => (
                <th 
                  key={plan.id}
                  scope="col"
                  className={`py-4 px-6 text-center font-medium relative ${
                    plan.is_popular ? 'bg-primary/5' : 'bg-gray-50'
                  }`}
                >
                  {plan.is_popular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                      Most Popular
                    </Badge>
                  )}
                  <span className="block text-lg font-semibold text-gray-900">
                    {plan.title}
                  </span>
                  <span className="block text-sm text-gray-500 mt-1">
                    {plan.title === "Enterprise" ? "Custom Pricing" : `$${plan.price}/month`}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {allFeatures.map((feature, index) => (
              <tr 
                key={feature} 
                className={`hover:bg-gray-50 ${
                  index % 2 === 0 ? 'bg-gray-50/50' : 'bg-white'
                }`}
              >
                <td className="py-4 px-6 text-sm font-medium text-gray-900">
                  {FEATURE_LABELS[feature]}
                </td>
                {plans.map((plan) => (
                  <td 
                    key={`${plan.id}-${feature}`}
                    className={`py-4 px-6 text-sm text-center ${
                      plan.is_popular ? 'bg-primary/5' : ''
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
