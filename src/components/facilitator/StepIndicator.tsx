
type Step = 1 | 2 | 3;

interface StepIndicatorProps {
  currentStep: Step;
}

export const StepIndicator = ({ currentStep }: StepIndicatorProps) => {
  return (
    <div className="flex flex-col gap-4 items-end">
      <div className={`flex items-center gap-2 ${currentStep >= 1 ? 'text-primary' : 'text-gray-400'}`}>
        <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center">1</div>
        <span>Choose your facilitator</span>
      </div>
      <div className={`flex items-center gap-2 ${currentStep >= 2 ? 'text-primary' : 'text-gray-400'}`}>
        <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center">2</div>
        <span>Select workshop type</span>
      </div>
      <div className={`flex items-center gap-2 ${currentStep >= 3 ? 'text-primary' : 'text-gray-400'}`}>
        <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center">3</div>
        <span>Describe participants</span>
      </div>
    </div>
  );
};
