
import * as React from "react";
import { cn } from "@/lib/utils";

const StepperTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("text-sm font-medium", className)} {...props} />
  ),
);
StepperTitle.displayName = "StepperTitle";

export { StepperTitle };
