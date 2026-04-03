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

  const getAvatarUrl = (facilitator: Facilitator): string => {
    if (!facilitator.id) return '/placeholder.svg';

    const pic = facilitator.profile_picture;

    if (pic) {
      // Full URL (http/https) or public asset path — use as-is
      if (pic.startsWith('http://') || pic.startsWith('https://') || pic.startsWith('/')) {
        return pic;
      }
      // Plain filename stored in DB (e.g. "52.jpg") — build the Railway storage URL.
      // The async facilitatorImages map may not be ready yet on first render, so we
      // construct the URL directly here to avoid a flash of the placeholder.
      const apiUrl = (import.meta.env.VITE_API_URL as string) || '';
      return `${apiUrl}/storage/v1/object/public/facilitator-avatars/${pic}`;
    }

    // Fall back to the async-loaded image map (covers user-uploaded avatars
    // that were stored with a full path rather than a plain filename)
    return facilitatorImages[facilitator.id] ?? '/placeholder.svg';
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
    <div className="mb-8">
      <div className="flex items-center gap-1">
        {/* Prev button — stays inside the card boundary on all screen sizes */}
        <Button
          variant="ghost"
          size="icon"
          aria-label="Previous facilitators"
          className="shrink-0 h-8 w-8"
          onClick={handlePrevious}
          disabled={startIndex === 0}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        {/* Responsive grid: 2 cols on xs (<480px), 3 on sm, 4 on md+ */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 flex-1">
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

        {/* Next button — stays inside the card boundary on all screen sizes */}
        <Button
          variant="ghost"
          size="icon"
          aria-label="Next facilitators"
          className="shrink-0 h-8 w-8"
          onClick={handleNext}
          disabled={startIndex >= maxStartIndex}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};
