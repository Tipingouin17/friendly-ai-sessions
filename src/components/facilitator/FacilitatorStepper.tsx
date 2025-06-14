
import { Step } from "@/types/facilitator";
import { Stepper, StepperItem, StepperTrigger, StepperIndicator, StepperSeparator } from "@/components/ui/stepper";
import { Lock } from "lucide-react";

interface FacilitatorStepperProps {
  currentStep: Step;
  setCurrentStep: (step: Step) => void;
  isStep1Disabled: boolean;
  isStep2Disabled: boolean;
  isStep3Disabled: boolean;
}

export const FacilitatorStepper = ({
  currentStep,
  setCurrentStep,
  isStep1Disabled,
  isStep2Disabled,
  isStep3Disabled
}: FacilitatorStepperProps) => {
  return (
    <Stepper 
      value={currentStep.toString()} 
      onValueChange={value => setCurrentStep(parseInt(value) as Step)} 
      className="mb-4"
    >
      <div className="flex items-center gap-2 w-full">
        <StepperItem value="1" disabled={isStep1Disabled}>
          <StepperTrigger className="flex flex-col items-center gap-2">
            <StepperIndicator>
              {isStep1Disabled && <Lock className="h-3 w-3" />}
            </StepperIndicator>
            <div className="text-sm font-medium">Choose Facilitator</div>
          </StepperTrigger>
        </StepperItem>
        
        <StepperSeparator />
        
        <StepperItem value="2" disabled={isStep2Disabled}>
          <StepperTrigger className="flex flex-col items-center gap-2">
            <StepperIndicator>
              {isStep2Disabled && <Lock className="h-3 w-3" />}
            </StepperIndicator>
            <div className="text-sm font-medium">Select Workshop</div>
          </StepperTrigger>
        </StepperItem>
        
        <StepperSeparator />
        
        <StepperItem value="3" disabled={isStep3Disabled}>
          <StepperTrigger className="flex flex-col items-center gap-2">
            <StepperIndicator>
              {isStep3Disabled && <Lock className="h-3 w-3" />}
            </StepperIndicator>
            <div className="text-sm font-medium">Setup Participants</div>
          </StepperTrigger>
        </StepperItem>
      </div>
    </Stepper>
  );
};
