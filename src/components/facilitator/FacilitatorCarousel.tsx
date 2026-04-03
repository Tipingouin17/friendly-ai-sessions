/**
 * Facilitator Carousel
 *
 * Facilitator component for the AIfacilitator application.
 */
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
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  const navigate = useNavigate();

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const itemsToShow = windowWidth < 480 ? 2 : windowWidth < 768 ? 3 : 4;

  // Total items includes the CreateFacilitatorButton as one extra slot
  const totalItems = facilitators.length + 1;
  const maxStartIndex = Math.max(0, totalItems - itemsToShow);

  useEffect(() => {
    if (startIndex > maxStartIndex) {
      setStartIndex(maxStartIndex);
    }
  }, [facilitators, startIndex, maxStartIndex]);

  const handlePrevious = () => {
    setStartIndex(Math.max(0, startIndex - 1));
  };

  const handleNext = () => {
    setStartIndex(Math.min(maxStartIndex, startIndex + 1));
  };

  const getAvatarUrl = (facilitator: Facilitator) => {
    if (!facilitator.id) return '/placeholder.svg';
    
    if (facilitator.profile_picture && (facilitator.profile_picture.startsWith('/avatars/') || facilitator.profile_picture.startsWith('http'))) {
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

  // Build the visible items for this page, including the CreateFacilitatorButton slot
  const visibleItems: Array<{ type: 'facilitator'; facilitator: Facilitator } | { type: 'create' }> = [];
  for (let i = startIndex; i < startIndex + itemsToShow && i < totalItems; i++) {
    if (i < facilitators.length) {
      visibleItems.push({ type: 'facilitator', facilitator: facilitators[i] });
    } else {
      visibleItems.push({ type: 'create' });
    }
  }

  return (
    <div className="relative mb-8">
      <div className="flex items-center">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Previous facilitators"
          className="absolute left-0 z-10 -translate-x-1/2"
          onClick={handlePrevious}
          disabled={startIndex === 0}
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>

        <div className="mx-12 grid grid-cols-4 gap-4 w-full">
          {visibleItems.map((item, idx) => {
            if (item.type === 'create') {
              return (
                <CreateFacilitatorButton
                  key="create-facilitator"
                  hasReachedFacilitatorLimit={hasReachedFacilitatorLimit}
                  canCreateCustomFacilitators={canCreateCustomFacilitators}
                  maxFacilitators={maxFacilitators}
                  onClick={onCreateNew}
                />
              );
            }
            const { facilitator } = item;
            const avatarUrl = getAvatarUrl(facilitator);
            const locked = isFacilitatorLocked(facilitator);
            return (
              <FacilitatorCard
                key={facilitator.id ?? idx}
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
        </div>

        <Button
          variant="ghost"
          size="icon"
          aria-label="Next facilitators"
          className="absolute right-0 z-10 translate-x-1/2"
          onClick={handleNext}
          disabled={startIndex >= maxStartIndex}
        >
          <ChevronRight className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
};
