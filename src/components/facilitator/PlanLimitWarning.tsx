
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PlanLimitWarningProps {
  canCreateCustomFacilitators: boolean;
  currentFacilitatorCount: number;
  maxFacilitators: number;
  onUpgrade: () => void;
}

export const PlanLimitWarning = ({
  canCreateCustomFacilitators,
  currentFacilitatorCount,
  maxFacilitators,
  onUpgrade
}: PlanLimitWarningProps) => {
  // Determine the error message based on the restriction reason
  const restrictionMessage = !canCreateCustomFacilitators
    ? "Your current plan doesn't allow creating custom facilitators."
    : `You've used ${currentFacilitatorCount} out of ${maxFacilitators} facilitators available in your plan.`;

  return (
    <div className="space-y-4">
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Plan Restriction</AlertTitle>
        <AlertDescription>
          {restrictionMessage} Please upgrade to {!canCreateCustomFacilitators ? "enable this feature" : "create more facilitators"}.
        </AlertDescription>
      </Alert>
      <Button onClick={onUpgrade} className="w-full">
        Upgrade Plan
      </Button>
    </div>
  );
};
