
import { cn } from "@/lib/utils";

type Step = 1 | 2 | 3;

interface StepIndicatorProps {
  currentStep: Step;
}

export const StepIndicator = ({ currentStep }: StepIndicatorProps) => {
  return (
    <div className="flex flex-col gap-12 max-w-2xl mx-auto mb-16">
      <div className={cn(
        "flex items-center gap-6",
        currentStep >= 1 ? "text-[#FFB800]" : "text-gray-400"
      )}>
        <div className={cn(
          "w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold",
          currentStep >= 1 ? "bg-[#FFB800]" : "bg-gray-200",
          "text-white"
        )}>
          1
        </div>
        <span className="text-3xl font-semibold">Choose your facilitator</span>
      </div>

      <div className={cn(
        "flex items-center gap-6",
        currentStep >= 2 ? "text-[#FFB800]" : "text-gray-400"
      )}>
        <div className={cn(
          "w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold",
          currentStep >= 2 ? "bg-[#FFB800]" : "bg-gray-200",
          currentStep >= 2 ? "text-white" : "text-gray-400"
        )}>
          2
        </div>
        <span className="text-3xl font-semibold">Select workshop type</span>
      </div>

      <div className={cn(
        "flex items-center gap-6",
        currentStep >= 3 ? "text-[#FFB800]" : "text-gray-400"
      )}>
        <div className={cn(
          "w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold",
          currentStep >= 3 ? "bg-[#FFB800]" : "bg-gray-200",
          currentStep >= 3 ? "text-white" : "text-gray-400"
        )}>
          3
        </div>
        <span className="text-3xl font-semibold">Describe participants</span>
      </div>
    </div>
  );
};
