/**
 * Step Navigation
 *
 * Facilitator component for the AIfacilitator application.
 */

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Step } from "@/types/facilitator";

interface StepNavigationProps {
  currentStep: Step;
  onPrevious: () => void;
  onNext: () => void;
  onSubmit: () => void;
  isNextDisabled: boolean;
  isSubmitDisabled: boolean;
  hasReachedSessionLimit: boolean;
}

export const StepNavigation = ({
  currentStep,
  onPrevious,
  onNext,
  onSubmit,
  isNextDisabled,
  isSubmitDisabled,
  hasReachedSessionLimit
}: StepNavigationProps) => {
  return (
    <div className="flex justify-between mt-8">
      {currentStep !== 1 && (
        <Button variant="outline" onClick={onPrevious}>
          <ChevronLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>
      )}
      
      {/* Add an empty div when on step 1 to maintain the justify-between layout */}
      {currentStep === 1 && <div></div>}

      {currentStep < 3 ? (
        <Button 
          onClick={onNext} 
          disabled={isNextDisabled}
        >
          Next
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      ) : (
        <Button 
          onClick={onSubmit} 
          disabled={isSubmitDisabled}
        >
          {hasReachedSessionLimit ? "Upgrade to Start Session" : "Start Session"}
        </Button>
      )}
    </div>
  );
};
