
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
import { useNavigate } from "react-router-dom";

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
  const [facilitatorImages, setFacilitatorImages] = useState<Record<number, string>>({ /* no-op */ });
  const [loadingImages, setLoadingImages] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const { planRestrictions, currentPlanId } = useUserPlan();
  const { 
    hasReachedFacilitatorLimit, 
    maxFacilitators, 
    currentFacilitatorCount,
    canCreateCustomFacilitators 
  } = usePlanLimits();
  
  // Hydration-safe client detection
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // Load all facilitator images only on client-side
  useEffect(() => {
    if (!isClient) {
      setLoadingImages(false);
      return;
    }

    const loadFacilitatorImages = async () => {
      if (!facilitators || facilitators.length === 0) {
        setLoadingImages(false);
        return;
      }

      setLoadingImages(true);
      const imageMap: Record<number, string> = { /* no-op */ };
      
      try {
        debugLog('all', `Loading images for ${facilitators.length} facilitators`);
        
        // First priority: Use direct profile_picture URLs for public uploads
        facilitators.forEach(facilitator => {
          if (facilitator.id && facilitator.profile_picture && facilitator.profile_picture.startsWith('/lovable-uploads/')) {
            imageMap[facilitator.id] = facilitator.profile_picture;
            debugLog('all', `Using direct profile_picture for facilitator ${facilitator.id}: ${facilitator.profile_picture}`);
          }
        });
        
        // Second priority: Load any remaining images that need processing
        const remainingFacilitators = facilitators.filter(f => 
          f.id && !imageMap[f.id]
        );
        
        if (remainingFacilitators.length > 0) {
          // Create an array of promises to load all images concurrently
          const imagePromises = remainingFacilitators.map(async (facilitator) => {
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
              debugLog('all', `Loaded avatar for facilitator ${result.id}: ${result.url}`);
            }
          });
        }
        
        setFacilitatorImages(imageMap);
      } catch (error) {
        console.error('Error loading facilitator images:', error);
        if (isClient) {
          toast({
            title: "Warning",
            description: "Some facilitator images could not be loaded",
            variant: "destructive",
          });
        }
      } finally {
        setLoadingImages(false);
      }
    };
    
    if (facilitators.length > 0) {
      loadFacilitatorImages();
    } else {
      setLoadingImages(false);
    }
  }, [facilitators, toast, isClient]);

  const handleCreateSuccess = () => {
    // Use React Router navigation instead of window.location.reload()
    navigate(0); // This refreshes the current route
  };

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
        facilitators={facilitators}
        selectedFacilitator={selectedFacilitator}
        onSelect={onSelect}
        onCreateNew={() => setIsCreateModalOpen(true)}
        facilitatorImages={facilitatorImages}
        hasReachedFacilitatorLimit={hasReachedFacilitatorLimit}
        maxFacilitators={maxFacilitators}
        canCreateCustomFacilitators={canCreateCustomFacilitators}
        isLoading={loadingImages || !isClient}
        userPlanId={currentPlanId}
      />
      
      <FacilitatorDetailsPanel
        selectedFacilitator={selectedFacilitator}
        facilitators={facilitators}
      />

      <CreateFacilitatorModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
};
