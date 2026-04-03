/**
 * stepper content
 *
 * UI primitive for the AIfacilitator application.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { useStepItem } from "./stepper-context";

const StepperContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const { state } = useStepItem();
    
    return (
      <div
        ref={ref}
        className={cn(
          "mt-2 transition-all",
          state === "active" ? "block" : "hidden",
          className
        )}
        {...props}
      />
    );
  }
);
StepperContent.displayName = "StepperContent";

export { StepperContent };
