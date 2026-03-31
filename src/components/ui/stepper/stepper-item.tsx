
import * as React from "react";
import { cn } from "@/lib/utils";
import { StepItemContext, useStepper } from "./stepper-context";
import { StepState } from "./types";

interface StepperItemProps extends React.HTMLAttributes<HTMLDivElement> {
  step?: number;
  value: string;
  completed?: boolean;
  disabled?: boolean;
  loading?: boolean;
}

const StepperItem = React.forwardRef<HTMLDivElement, StepperItemProps>(
  (
    { step, value, completed = false, disabled = false, loading = false, className, children, ...props },
    ref,
  ) => {
    const { activeStep } = useStepper();
    const stepNumber = step || parseInt(value, 10);
    
    const state: StepState =
      completed || stepNumber < activeStep ? "completed" : activeStep === stepNumber ? "active" : "inactive";

    const isLoading = loading && stepNumber === activeStep;

    return (
      <StepItemContext.Provider value={{ step: stepNumber, state, isDisabled: disabled, isLoading }}>
        <div
          ref={ref}
          className={cn(
            "group/step flex items-center group-data-[orientation=horizontal]/stepper:flex-row group-data-[orientation=vertical]/stepper:flex-col",
            className,
          )}
          data-state={state}
          {...(isLoading ? { "data-loading": true } : { /* no-op */ })}
          {...props}
        >
          {children}
        </div>
      </StepItemContext.Provider>
    );
  },
);
StepperItem.displayName = "StepperItem";

export { StepperItem };
