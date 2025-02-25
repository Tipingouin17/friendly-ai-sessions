
import { cn } from "@/lib/utils";

type Step = 1 | 2 | 3;

interface StepIndicatorProps {
  currentStep: Step;
}

export const StepIndicator = ({ currentStep }: StepIndicatorProps) => {
  return (
    <div className="flex flex-col gap-8 max-w-xl mx-auto mb-12">
      <div className={cn(
        "flex items-center gap-4",
        currentStep >= 1 ? "text-[#FFC107]" : "text-gray-400"
      )}>
        <div className="w-16 h-16 rounded-full bg-[#FFC107] text-white flex items-center justify-center text-2xl font-semibold">
          1
        </div>
        <span className="text-2xl font-semibold">Choose your facilitator</span>
      </div>

      <div className={cn(
        "flex items-center gap-4",
        currentStep >= 2 ? "text-[#FFC107]" : "text-gray-400"
      )}>
        <div className={cn(
          "w-16 h-16 rounded-full flex items-center justify-center text-2xl font-semibold",
          currentStep >= 2 ? "bg-[#FFC107] text-white" : "bg-gray-200 text-gray-400"
        )}>
          2
        </div>
        <span className="text-2xl font-semibold">Select workshop type</span>
      </div>

      <div className={cn(
        "flex items-center gap-4",
        currentStep >= 3 ? "text-[#FFC107]" : "text-gray-400"
      )}>
        <div className={cn(
          "w-16 h-16 rounded-full flex items-center justify-center text-2xl font-semibold",
          currentStep >= 3 ? "bg-[#FFC107] text-white" : "bg-gray-200 text-gray-400"
        )}>
          3
        </div>
        <span className="text-2xl font-semibold">Describe participants</span>
      </div>
    </div>
  );
};
