
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Facilitator } from "@/types/facilitator";
import { FacilitatorCard } from "./FacilitatorCard";
import { CreateFacilitatorButton } from "./CreateFacilitatorButton";
import { useState, useEffect } from "react";

interface FacilitatorCarouselProps {
  facilitators: Facilitator[];
  selectedFacilitator: number | null;
  onSelect: (id: number) => void;
  onCreateNew: () => void;
  facilitatorImages: Record<number, string>;
  hasReachedFacilitatorLimit: boolean;
  maxFacilitators: number;
  canCreateCustomFacilitators: boolean;
  isLoading?: boolean;
}

export const FacilitatorCarousel = ({
  facilitators,
  selectedFacilitator,
  onSelect,
  onCreateNew,
  facilitatorImages,
  hasReachedFacilitatorLimit,
  maxFacilitators,
  canCreateCustomFacilitators,
  isLoading = false
}: FacilitatorCarouselProps) => {
  const [startIndex, setStartIndex] = useState(0);
  const itemsToShow = 4;
  
  // Adjust startIndex if needed when the facilitators list changes
  useEffect(() => {
    if (startIndex > 0 && startIndex >= facilitators.length - itemsToShow) {
      setStartIndex(Math.max(0, facilitators.length - itemsToShow));
    }
  }, [facilitators, startIndex]);

  const handlePrevious = () => {
    setStartIndex(Math.max(0, startIndex - 1));
  };

  const handleNext = () => {
    setStartIndex(Math.min(facilitators.length - itemsToShow, startIndex + 1));
  };

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
          {facilitators.slice(startIndex, startIndex + itemsToShow).map((facilitator) => {
            const avatarUrl = facilitator.id && facilitatorImages[facilitator.id] 
              ? facilitatorImages[facilitator.id] 
              : '/placeholder.svg';
            
            return (
              <FacilitatorCard
                key={facilitator.id}
                facilitator={facilitator}
                isSelected={selectedFacilitator === facilitator.id}
                avatarUrl={avatarUrl}
                onClick={() => onSelect(facilitator.id)}
                isLoading={isLoading}
              />
            );
          })}
          
          <CreateFacilitatorButton
            hasReachedFacilitatorLimit={hasReachedFacilitatorLimit}
            canCreateCustomFacilitators={canCreateCustomFacilitators}
            maxFacilitators={maxFacilitators}
            onClick={onCreateNew}
          />
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="absolute right-0 z-10 translate-x-1/2"
          onClick={handleNext}
          disabled={startIndex >= facilitators.length - itemsToShow}
        >
          <ChevronRight className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
};
