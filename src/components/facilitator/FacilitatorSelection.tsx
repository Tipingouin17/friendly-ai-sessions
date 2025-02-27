
import { ChevronLeft, ChevronRight, Plus, Lock } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Facilitator } from "@/types/facilitator";
import { CreateFacilitatorModal } from "./CreateFacilitatorModal";
import { useUserPlan } from "@/hooks/useUserPlan";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface FacilitatorSelectionProps {
  facilitators: Facilitator[];
  selectedFacilitator: number | null;
  onSelect: (id: number) => void;
  isLoading?: boolean;
}

export const FacilitatorSelection = ({ 
  facilitators, 
  selectedFacilitator, 
  onSelect,
  isLoading = false 
}: FacilitatorSelectionProps) => {
  const [startIndex, setStartIndex] = useState(0);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const itemsToShow = 4;
  const { planRestrictions } = useUserPlan();
  const { hasReachedFacilitatorLimit, maxFacilitators } = usePlanLimits();

  // Get facilitators accessible by the current plan
  const accessibleFacilitators = facilitators.filter((facilitator, index) => {
    // For unlimited plans, show all facilitators
    if (!planRestrictions || planRestrictions.no_of_facilitator === null) {
      return true;
    }
    // For limited plans, only show facilitators up to the plan limit
    return index < (planRestrictions.no_of_facilitator || 0);
  });

  const lockedFacilitators = facilitators.filter(facilitator => 
    !accessibleFacilitators.find(f => f.id === facilitator.id)
  );

  // Adjust startIndex if needed when the accessible facilitators list changes
  useEffect(() => {
    if (startIndex > 0 && startIndex >= accessibleFacilitators.length - itemsToShow) {
      setStartIndex(Math.max(0, accessibleFacilitators.length - itemsToShow));
    }
  }, [accessibleFacilitators, startIndex]);

  const handlePrevious = () => {
    setStartIndex(Math.max(0, startIndex - 1));
  };

  const handleNext = () => {
    setStartIndex(Math.min(accessibleFacilitators.length - itemsToShow, startIndex + 1));
  };

  if (isLoading) {
    return <div>Loading facilitators...</div>;
  }

  return (
    <div className="relative">
      <div className="flex items-center">
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-0 z-10 -translate-x-1/2"
          onClick={handlePrevious}
          disabled={startIndex === 0}
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>

        <div className="mx-12 flex gap-4 overflow-hidden">
          {accessibleFacilitators.slice(startIndex, startIndex + itemsToShow).map((facilitator) => (
            <div
              key={facilitator.id}
              className={`flex w-1/4 shrink-0 cursor-pointer flex-col items-center rounded-xl border p-6 transition-all ${
                selectedFacilitator === facilitator.id ? 'border-primary' : 'border-gray-200'
              }`}
              onClick={() => onSelect(facilitator.id)}
            >
              <img 
                src={facilitator.profile_picture} 
                alt={facilitator.title} 
                className="mb-4 h-24 w-24 rounded-full" 
              />
              <h3 className="text-center text-lg font-semibold leading-tight">{facilitator.title}</h3>
            </div>
          ))}
          
          {/* Show locked facilitators if there are any */}
          {lockedFacilitators.length > 0 && startIndex + itemsToShow > accessibleFacilitators.length && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex w-1/4 shrink-0 flex-col items-center justify-center rounded-xl border border-gray-200 p-6 opacity-60 cursor-not-allowed">
                    <div className="relative">
                      <img 
                        src={lockedFacilitators[0].profile_picture} 
                        alt="Locked facilitator" 
                        className="mb-4 h-24 w-24 rounded-full filter grayscale" 
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Lock className="h-10 w-10 text-gray-500" />
                      </div>
                    </div>
                    <h3 className="text-center text-lg font-semibold leading-tight text-gray-400">
                      Locked Facilitator
                    </h3>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Upgrade your plan to access more facilitators.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          {/* Create new facilitator button */}
          <div 
            className={`flex w-1/4 shrink-0 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 p-6 hover:border-primary transition-all ${
              hasReachedFacilitatorLimit ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            onClick={() => !hasReachedFacilitatorLimit && setIsCreateModalOpen(true)}
          >
            <Plus className="mb-2 h-12 w-12 text-gray-400" />
            <span className="text-center text-sm text-gray-600">
              {hasReachedFacilitatorLimit 
                ? `Limited to ${maxFacilitators} facilitators` 
                : "Add New Facilitator"}
            </span>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="absolute right-0 z-10 translate-x-1/2"
          onClick={handleNext}
          disabled={startIndex >= accessibleFacilitators.length - itemsToShow}
        >
          <ChevronRight className="h-6 w-6" />
        </Button>
      </div>
      {selectedFacilitator && (
        <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <h3 className="mb-2 text-lg font-semibold">
            {facilitators.find(f => f.id === selectedFacilitator)?.title}
          </h3>
          <p className="text-gray-600">
            {facilitators.find(f => f.id === selectedFacilitator)?.details}
          </p>
        </div>
      )}

      <CreateFacilitatorModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSuccess={() => {
          window.location.reload();
        }}
      />
    </div>
  );
};
