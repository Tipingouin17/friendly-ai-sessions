
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface PlanLimitAlertProps {
  hasReachedSessionLimit: boolean;
  hasReachedFacilitatorLimit: boolean;
  currentSessionCount: number;
  maxSessions: number;
  onUpgrade: () => void;
}

export const PlanLimitAlert = ({
  hasReachedSessionLimit,
  hasReachedFacilitatorLimit,
  currentSessionCount,
  maxSessions,
  onUpgrade
}: PlanLimitAlertProps) => {
  if (!(hasReachedSessionLimit || hasReachedFacilitatorLimit)) {
    return null;
  }

  // Don't show the alert if maxSessions is Infinity
  if (hasReachedSessionLimit && maxSessions === Infinity) {
    return null;
  }

  return (
    <Alert variant="destructive" className="mb-6">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle className="text-left">Plan Limit Reached</AlertTitle>
      <AlertDescription className="flex justify-between items-center">
        <span>
          {hasReachedSessionLimit 
            ? `You've used ${currentSessionCount} out of ${maxSessions} sessions available in your plan.` 
            : "You've reached your facilitator limit in your current plan."
          }
        </span>
        <Button onClick={onUpgrade} size="sm">
          Upgrade Plan
        </Button>
      </AlertDescription>
    </Alert>
  );
};
