/**
 * Facilitator Stepper
 *
 * Facilitator component for the AIfacilitator application.
 */

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
  isStep3Disabled,
}: FacilitatorStepperProps) => {
  const steps = [
    { value: "1", label: "Choose Facilitator", shortLabel: "Facilitator",   disabled: isStep1Disabled },
    { value: "2", label: "Select Workshop",    shortLabel: "Workshop",       disabled: isStep2Disabled },
    { value: "3", label: "Setup Participants", shortLabel: "Participants",   disabled: isStep3Disabled },
  ];

  return (
    <Stepper
      value={currentStep.toString()}
      onValueChange={value => setCurrentStep(parseInt(value) as Step)}
      className="mb-6"
    >
      {/* Full-width flex row — shrinks gracefully on mobile */}
      <div className="flex items-center w-full">
        {steps.map((step, idx) => (
          <div key={step.value} className="flex items-center flex-1 min-w-0">
            <StepperItem value={step.value} disabled={step.disabled} className="flex-1 min-w-0">
              <StepperTrigger className="flex flex-col items-center gap-1.5 w-full px-1">
                <StepperIndicator>
                  {step.disabled && <Lock className="h-3 w-3" />}
                </StepperIndicator>
                {/* Full label on md+, abbreviated on mobile */}
                <span className="hidden md:block text-sm font-medium text-center leading-tight">
                  {step.label}
                </span>
                <span className="md:hidden text-xs font-medium text-center leading-tight">
                  {step.shortLabel}
                </span>
              </StepperTrigger>
            </StepperItem>
            {/* Separator between steps only */}
            {idx < steps.length - 1 && <StepperSeparator className="flex-1" />}
          </div>
        ))}
      </div>
    </Stepper>
  );
};
