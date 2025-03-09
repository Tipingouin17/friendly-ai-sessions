
import { useState, useEffect } from "react";
import { Facilitator } from "@/types/facilitator";
import { CreateFacilitatorModal } from "./CreateFacilitatorModal";
import { useUserPlan } from "@/hooks/useUserPlan";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { getFacilitatorAvatarUrl } from "@/utils/facilitatorUtils";
import { FacilitatorCarousel } from "./FacilitatorCarousel";
import { FacilitatorDetailsPanel } from "./FacilitatorDetailsPanel";
import { Skeleton } from "@/components/ui/skeleton";

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
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [facilitatorImages, setFacilitatorImages] = useState<Record<number, string>>({});
  const [loadingImages, setLoadingImages] = useState(true);
  
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
  
  // Load all facilitator images
  useEffect(() => {
    const loadFacilitatorImages = async () => {
      setLoadingImages(true);
      const imageMap: Record<number, string> = {};
      
      console.log('Loading facilitator images for', facilitators.length, 'facilitators');
      
      try {
        const loadPromises = facilitators.map(async (facilitator) => {
          if (facilitator.id) {
            console.log(`Loading avatar for facilitator ID ${facilitator.id} (${facilitator.title})`);
            console.log(`Profile picture value: ${facilitator.profile_picture}`);
            
            const avatarUrl = await getFacilitatorAvatarUrl(facilitator);
            console.log(`Resolved avatar URL for facilitator ${facilitator.id}: ${avatarUrl}`);
            return { id: facilitator.id, url: avatarUrl };
          }
          return null;
        });

        const results = await Promise.all(loadPromises);
        
        results.forEach(result => {
          if (result) {
            imageMap[result.id] = result.url;
          }
        });
        
        console.log('All facilitator images loaded:', imageMap);
        setFacilitatorImages(imageMap);
      } catch (error) {
        console.error('Error loading facilitator images:', error);
      } finally {
        setLoadingImages(false);
      }
    };
    
    if (facilitators.length > 0) {
      loadFacilitatorImages();
    } else {
      setLoadingImages(false);
    }
  }, [facilitators]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="w-1/4 p-4">
              <Skeleton className="mx-auto mb-4 h-24 w-24 rounded-full" />
              <Skeleton className="mx-auto h-6 w-3/4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <FacilitatorCarousel
        facilitators={accessibleFacilitators}
        selectedFacilitator={selectedFacilitator}
        onSelect={onSelect}
        onCreateNew={() => setIsCreateModalOpen(true)}
        facilitatorImages={facilitatorImages}
        hasReachedFacilitatorLimit={hasReachedFacilitatorLimit}
        maxFacilitators={maxFacilitators}
        canCreateCustomFacilitators={canCreateCustomFacilitators}
        isLoading={loadingImages}
      />
      
      <FacilitatorDetailsPanel
        selectedFacilitator={selectedFacilitator}
        facilitators={facilitators}
      />

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
