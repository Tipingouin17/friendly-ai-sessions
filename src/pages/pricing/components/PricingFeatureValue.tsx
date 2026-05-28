/**
 * Pricing Feature Value
 *
 * Page for the AIfacilitator application.
 */

import { Check, X, Minus, Infinity as InfinityIcon } from "lucide-react";

interface PricingFeatureValueProps {
  value: boolean | string | number | null | undefined;
}

export const PricingFeatureValue = ({ value }: PricingFeatureValueProps) => {
  if (typeof value === 'boolean') {
    return value ? (
      <Check className="h-5 w-5 text-primary mx-auto" />
    ) : (
      <X className="h-5 w-5 text-muted-foreground mx-auto" />
    );
  }
  
  if (value === 'unlimited' || value === 'Unlimited') {
    return (
      <div className="flex flex-col items-center">
        <InfinityIcon className="h-5 w-5 text-primary mx-auto" />
        <span className="text-xs text-gray-700 mt-1">Unlimited</span>
      </div>
    );
  }
  
  if (value === null || value === undefined) {
    return <Minus className="h-5 w-5 text-muted-foreground mx-auto" />;
  }
  
  if (typeof value === 'number') {
    // Check if the value is greater than or equal to 999999 for unlimited display
    if (value >= 999999) {
      return (
        <div className="flex flex-col items-center">
          <InfinityIcon className="h-5 w-5 text-primary mx-auto" />
          <span className="text-xs text-gray-700 mt-1">Unlimited</span>
        </div>
      );
    }
    return (
      <span className="text-lg font-semibold text-gray-900">{value}</span>
    );
  }
  
  return <span>{value}</span>;
};
