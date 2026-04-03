/**
 * Plan Limit Alert
 *
 * Facilitator component for the AIfacilitator application.
 */

import { Button } from "@/components/ui/button";
import { Zap, ArrowRight } from "lucide-react";

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
  if (maxSessions === Infinity) {
    return null;
  }

  const message = hasReachedSessionLimit
    ? `You've used all ${maxSessions} sessions available in your current plan.`
    : "You've reached your facilitator limit in your current plan.";

  return (
    <div className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-indigo-200 bg-indigo-50 px-5 py-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100">
          <Zap className="h-4 w-4 text-indigo-600" />
        </div>
        <div>
          <p className="font-semibold text-indigo-900">Plan Limit Reached</p>
          <p className="text-sm text-indigo-700 mt-0.5">{message}</p>
        </div>
      </div>
      <Button
        onClick={onUpgrade}
        size="sm"
        className="flex-shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-500/20 gap-1.5"
      >
        Upgrade Plan
        <ArrowRight className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
};
