/**
 * stepper context
 *
 * UI primitive for the AIfacilitator application.
 */

import * as React from "react";
import { StepperContextValue, StepItemContextValue } from "./types";

export const StepperContext = React.createContext<StepperContextValue | undefined>(undefined);
export const StepItemContext = React.createContext<StepItemContextValue | undefined>(undefined);

export const useStepper = () => {
  const context = React.useContext(StepperContext);
  if (!context) {
    throw new Error("useStepper must be used within a Stepper");
  }
  return context;
};

export const useStepItem = () => {
  const context = React.useContext(StepItemContext);
  if (!context) {
    throw new Error("useStepItem must be used within a StepperItem");
  }
  return context;
};
