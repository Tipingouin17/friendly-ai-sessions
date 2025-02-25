
import { Check, X, Minus } from "lucide-react";

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
    return <span>∞</span>;
  }
  if (value === null || value === undefined) {
    return <Minus className="h-5 w-5 text-muted-foreground mx-auto" />;
  }
  return <span>{value}</span>;
};
