
import { Step } from "@/types/facilitator";

const steps = [{
  step: 1,
  title: "Choose your facilitator"
}, {
  step: 2,
  title: "Select workshop type"
}, {
  step: 3,
  title: "Describe participants"
}];

export const Stepper = ({ value }: { value: Step }) => (
  <div className="mb-8">
    {steps.map((step, index) => (
      <div key={step.step} className="flex items-center">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center ${
            step.step <= value
              ? "bg-primary text-white"
              : "bg-gray-200 text-gray-500"
          }`}
        >
          {step.step}
        </div>
        <span className="ml-3 text-sm font-medium">{step.title}</span>
        {index < steps.length - 1 && (
          <div className="flex-1 h-px bg-gray-200 mx-4" />
        )}
      </div>
    ))}
  </div>
);
