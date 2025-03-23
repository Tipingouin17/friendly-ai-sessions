
import { useState, useEffect } from "react";
import { Facilitator } from "@/types/facilitator";
import { CreateFacilitatorModal } from "./CreateFacilitatorModal";
import { useUserPlan } from "@/hooks/useUserPlan";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { getFacilitatorAvatarUrl } from "@/utils/facilitatorUtils";
import { FacilitatorCarousel } from "./FacilitatorCarousel";
import { FacilitatorDetailsPanel } from "./FacilitatorDetailsPanel";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { debugLog } from "@/utils/debugLogger";

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
  const { toast } = useToast();
  
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
      if (!facilitators || facilitators.length === 0) {
        setLoadingImages(false);
        return;
      }

      setLoadingImages(true);
      const imageMap: Record<number, string> = {};
      
      try {
        debugLog('participants', `Loading images for ${facilitators.length} facilitators`);
        
        // Create an array of promises to load all images concurrently
        const imagePromises = facilitators.map(async (facilitator) => {
          if (facilitator.id) {
            try {
              // Try to get the avatar URL using the centralized function
              const avatarUrl = await getFacilitatorAvatarUrl(facilitator);
              return { id: facilitator.id, url: avatarUrl };
            } catch (error) {
              console.error(`Error loading avatar for facilitator ${facilitator.id}:`, error);
              return { id: facilitator.id, url: '/placeholder.svg' };
            }
          }
          return null;
        });
        
        // Wait for all images to load (or fail)
        const results = await Promise.all(imagePromises.filter(Boolean));
        
        // Process results into the image map
        results.forEach(result => {
          if (result && result.id) {
            imageMap[result.id] = result.url;
            debugLog('participants', `Loaded avatar for facilitator ${result.id}: ${result.url}`);
          }
        });
        
        setFacilitatorImages(imageMap);
        debugLog('participants', 'Finished loading facilitator images', imageMap);
      } catch (error) {
        console.error('Error loading facilitator images:', error);
        toast({
          title: "Warning",
          description: "Some facilitator images could not be loaded",
          variant: "destructive",
        });
      } finally {
        setLoadingImages(false);
      }
    };
    
    if (facilitators.length > 0) {
      loadFacilitatorImages();
    } else {
      setLoadingImages(false);
    }
  }, [facilitators, toast]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="w-1/4 p-4">
              <Skeleton className="mx-auto mb-4 h-20 w-20 rounded-full" />
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
