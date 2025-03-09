
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
      <Button variant="outline" onClick={onPrevious} disabled={currentStep === 1}>
        <ChevronLeft className="w-4 h-4 mr-2" />
        Previous
      </Button>

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
