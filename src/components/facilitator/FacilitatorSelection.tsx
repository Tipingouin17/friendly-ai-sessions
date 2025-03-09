
import { ChevronLeft, ChevronRight, Plus, Lock } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Facilitator } from "@/types/facilitator";
import { CreateFacilitatorModal } from "./CreateFacilitatorModal";
import { useUserPlan } from "@/hooks/useUserPlan";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getFacilitatorAvatarUrl, handleAvatarError } from "@/utils/facilitatorUtils";

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
  const { 
    hasReachedFacilitatorLimit, 
    maxFacilitators, 
    currentFacilitatorCount,
    canCreateCustomFacilitators 
  } = usePlanLimits();
  
  // Filter facilitators based on your ability to USE them, not CREATE them
  // All existing facilitators should be accessible for selection
  const accessibleFacilitators = facilitators;
  
  // These are the facilitators you CANNOT CREATE MORE OF, but can still select
  const lockedFacilitators = []; // No locked facilitators since all are accessible for selection

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
  
  // Determine if the "Add New Facilitator" button should be disabled
  const isCreateDisabled = hasReachedFacilitatorLimit || !canCreateCustomFacilitators;

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
              <div className="mb-4 h-24 w-24 rounded-full overflow-hidden flex items-center justify-center bg-gray-100">
                <img 
                  src={getFacilitatorAvatarUrl(facilitator.id)} 
                  alt={facilitator.title} 
                  className="h-full w-full object-cover" 
                  onError={handleAvatarError}
                />
              </div>
              <h3 className="text-center text-lg font-semibold leading-tight">{facilitator.title}</h3>
            </div>
          ))}
          
          {/* Create new facilitator button - show/hide based on customisable_facilitators permission */}
          {canCreateCustomFacilitators ? (
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
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex w-1/4 shrink-0 flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 p-6 opacity-50 cursor-not-allowed">
                    <div className="relative">
                      <Plus className="mb-2 h-12 w-12 text-gray-400" />
                      <Lock className="absolute top-0 right-0 h-6 w-6 text-gray-500 transform translate-x-1/4 -translate-y-1/4" />
                    </div>
                    <span className="text-center text-sm text-gray-600">
                      Custom Facilitators Locked
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Upgrade your plan to create custom facilitators.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
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
