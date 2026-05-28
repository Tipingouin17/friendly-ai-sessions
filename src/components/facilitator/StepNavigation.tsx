/**
 * Step Navigation
 *
 * Facilitator component for the AIfacilitator application.
 */

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Step } from "@/types/facilitator";

interface StepNavigationProps {
  currentStep: Step;
  onPrevious: () => void;
  onNext: () => void;
  onSubmit: () => void;
  isNextDisabled: boolean;
  isSubmitDisabled: boolean;
  hasReachedSessionLimit: boolean;
  /** True while the session creation API call is in-flight */
  isSubmitting?: boolean;
  isScheduled?: boolean;
}

export const StepNavigation = ({
  currentStep,
  onPrevious,
  onNext,
  onSubmit,
  isNextDisabled,
  isSubmitDisabled,
  hasReachedSessionLimit,
  isSubmitting = false,
  isScheduled = false
}: StepNavigationProps) => {
  return (
    <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-100 gap-3">
      {/* Back button — hidden on step 1, shown from step 2 onward */}
      {currentStep !== 1 ? (
        <Button variant="outline" onClick={onPrevious} className="shrink-0" disabled={isSubmitting}>
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
      ) : (
        <div aria-hidden="true" />
      )}

      {currentStep < 3 ? (
        <Button
          onClick={onNext}
          disabled={isNextDisabled}
          className="shrink-0"
        >
          Next
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      ) : (
        <Button
          onClick={onSubmit}
          disabled={isSubmitDisabled || isSubmitting}
          className="shrink-0 text-sm"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              <span className="sm:hidden">{isScheduled ? "Scheduling..." : "Starting..."}</span>
              <span className="hidden sm:inline">{isScheduled ? "Scheduling Session..." : "Starting Session..."}</span>
            </>
          ) : (
            <>
              {/* Abbreviated label on xs screens to avoid overflow */}
              <span className="sm:hidden">
                {hasReachedSessionLimit ? "Upgrade Plan" : isScheduled ? "Schedule Session" : "Start Session"}
              </span>
              <span className="hidden sm:inline">
                {hasReachedSessionLimit ? "Upgrade to Start Session" : isScheduled ? "Schedule Session" : "Start Session"}
              </span>
            </>
          )}
        </Button>
      )}
    </div>
  );
};
