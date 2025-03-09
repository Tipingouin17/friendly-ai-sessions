
import { ChevronLeft, ChevronRight, Plus, Lock } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Facilitator } from "@/types/facilitator";
import { CreateFacilitatorModal } from "./CreateFacilitatorModal";
import { useUserPlan } from "@/hooks/useUserPlan";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getFacilitatorAvatarUrl, handleAvatarError } from "@/utils/facilitatorUtils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

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
  const [facilitatorImages, setFacilitatorImages] = useState<Record<number, string>>({});
  const [loadingImages, setLoadingImages] = useState(true);
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
  
  // Adjust startIndex if needed when the accessible facilitators list changes
  useEffect(() => {
    if (startIndex > 0 && startIndex >= accessibleFacilitators.length - itemsToShow) {
      setStartIndex(Math.max(0, accessibleFacilitators.length - itemsToShow));
    }
  }, [accessibleFacilitators, startIndex]);

  // Load all facilitator images
  useEffect(() => {
    const loadFacilitatorImages = async () => {
      setLoadingImages(true);
      const imageMap: Record<number, string> = {};
      
      console.log('Loading facilitator images for', facilitators.length, 'facilitators');
      
      for (const facilitator of facilitators) {
        if (facilitator.id) {
          console.log(`Loading avatar for facilitator ID ${facilitator.id} (${facilitator.title})`);
          console.log(`Profile picture value: ${facilitator.profile_picture}`);
          
          const avatarUrl = await getFacilitatorAvatarUrl(facilitator);
          imageMap[facilitator.id] = avatarUrl;
        }
      }
      
      console.log('Facilitator images:', imageMap);
      setFacilitatorImages(imageMap);
      setLoadingImages(false);
    };
    
    if (facilitators.length > 0) {
      loadFacilitatorImages();
    }
  }, [facilitators]);

  const handlePrevious = () => {
    setStartIndex(Math.max(0, startIndex - 1));
  };

  const handleNext = () => {
    setStartIndex(Math.min(accessibleFacilitators.length - itemsToShow, startIndex + 1));
  };

  if (isLoading || loadingImages) {
    return <div className="py-12 text-center">Loading facilitators...</div>;
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
          {accessibleFacilitators.slice(startIndex, startIndex + itemsToShow).map((facilitator) => {
            // Get avatar URL from our pre-loaded map
            const avatarUrl = facilitator.id && facilitatorImages[facilitator.id] 
              ? facilitatorImages[facilitator.id] 
              : '/placeholder.svg';
            
            return (
              <div
                key={facilitator.id}
                className={`flex w-1/4 shrink-0 cursor-pointer flex-col items-center rounded-xl border p-6 transition-all ${
                  selectedFacilitator === facilitator.id ? 'border-primary' : 'border-gray-200'
                }`}
                onClick={() => onSelect(facilitator.id)}
              >
                <div className="mb-4 h-24 w-24 rounded-full overflow-hidden flex items-center justify-center bg-gray-100">
                  <Avatar className="h-full w-full">
                    <AvatarImage 
                      src={avatarUrl} 
                      alt={facilitator.title || 'Facilitator'} 
                      onError={handleAvatarError}
                    />
                    <AvatarFallback>{facilitator.title?.charAt(0) || 'F'}</AvatarFallback>
                  </Avatar>
                </div>
                <h3 className="text-center text-lg font-semibold leading-tight">{facilitator.title}</h3>
              </div>
            );
          })}
          
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
