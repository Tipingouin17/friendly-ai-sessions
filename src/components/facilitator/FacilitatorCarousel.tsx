import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Facilitator } from "@/types/facilitator";
import { FacilitatorCard } from "./FacilitatorCard";
import { CreateFacilitatorButton } from "./CreateFacilitatorButton";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

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
  userPlanId: number | null;
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
  isLoading = false,
  userPlanId,
}: FacilitatorCarouselProps) => {
  const [startIndex, setStartIndex] = useState(0);
  const itemsToShow = 4;
  const navigate = useNavigate();

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

  const getAvatarUrl = (facilitator: Facilitator) => {
    if (!facilitator.id) return '/placeholder.svg';
    
    if (facilitator.profile_picture && facilitator.profile_picture.startsWith('/lovable-uploads/')) {
      return facilitator.profile_picture;
    }
    
    return facilitator.id && facilitatorImages[facilitator.id] 
      ? facilitatorImages[facilitator.id] 
      : '/placeholder.svg';
  };

  // Determine if a facilitator is locked for the current user's plan
  // A facilitator is locked if its plan_id is greater than the user's current plan_id
  const isFacilitatorLocked = (facilitator: Facilitator): boolean => {
    if (!facilitator.plan_id) return false; // no plan requirement = always accessible
    if (!userPlanId) return facilitator.plan_id > 1; // no plan = Free (id=1)
    return facilitator.plan_id > userPlanId;
  };

  const visibleFacilitators = facilitators.slice(startIndex, startIndex + itemsToShow);

  return (
    <div className="relative mb-8">
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
          {visibleFacilitators.map((facilitator) => {
            const avatarUrl = getAvatarUrl(facilitator);
            const locked = isFacilitatorLocked(facilitator);

            return (
              <FacilitatorCard
                key={facilitator.id}
                facilitator={facilitator}
                isSelected={!locked && selectedFacilitator === facilitator.id}
                avatarUrl={avatarUrl}
                onClick={() => {
                  if (locked) {
                    // Redirect to pricing page when clicking a locked facilitator
                    navigate('/pricing');
                  } else if (facilitator.id) {
                    onSelect(facilitator.id);
                  }
                }}
                isLoading={isLoading}
                isLocked={locked}
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
