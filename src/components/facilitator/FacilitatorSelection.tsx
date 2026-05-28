/**
 * Facilitator Selection
 *
 * Facilitator component for the AIfacilitator application.
 */

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
import { CalendarClock, Mail, Play, Users } from "lucide-react";
import type { UpcomingScheduledSession } from "@/services/facilitatorService";
import { Button } from "@/components/ui/button";


const formatUpcomingSessionTime = (iso: string) => {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
};

interface FacilitatorSelectionProps {
  facilitators: Facilitator[];
  selectedFacilitator: number | null;
  onSelect: (id: number) => void;
  isLoading?: boolean;
  upcomingScheduledSessions?: UpcomingScheduledSession[];
  isLoadingUpcomingSessions?: boolean;
}

export const FacilitatorSelection = ({ 
  facilitators, 
  selectedFacilitator, 
  onSelect,
  isLoading = false,
  upcomingScheduledSessions = [],
  isLoadingUpcomingSessions = false 
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
          if (facilitator.id && facilitator.profile_picture && (facilitator.profile_picture.startsWith('/avatars/') || facilitator.profile_picture.startsWith('http'))) {
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

      {(isLoadingUpcomingSessions || upcomingScheduledSessions.length > 0) && (
        <section className="mb-6 rounded-3xl border border-indigo-100 bg-indigo-50/70 p-4 text-left shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-indigo-700"><CalendarClock className="h-4 w-4" /> Upcoming scheduled sessions</p>
              <p className="mt-1 text-sm text-slate-600">Reconnect to a scheduled waiting area or finish invitation drafts before participants arrive.</p>
            </div>
          </div>
          {isLoadingUpcomingSessions ? (
            <div className="h-24 animate-pulse rounded-2xl bg-white/80" />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {upcomingScheduledSessions.slice(0, 4).map((session) => (
                <article key={session.id} className="rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-semibold text-slate-950">{session.sessions?.title || 'Scheduled session'}</h3>
                      <p className="mt-1 text-sm text-slate-500">{formatUpcomingSessionTime(session.scheduled_start_at)}</p>
                    </div>
                    <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-700">Scheduled</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-600">
                    <span className="inline-flex items-center gap-1.5"><Users className="h-4 w-4 text-indigo-500" /> {Math.max((session.participants ?? 1) - 1, 0)} seats</span>
                    <span className="inline-flex items-center gap-1.5"><Mail className="h-4 w-4 text-indigo-500" /> {session.invited_count} invited</span>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button size="sm" className="flex-1 bg-indigo-600 hover:bg-indigo-700" onClick={() => navigate(`/session/host?id=${session.id}`)}><Play className="mr-2 h-4 w-4" /> Reconnect</Button>
                    <Button size="sm" variant="outline" onClick={() => navigate(`/schedule-invitations?id=${session.id}`)}>Invite</Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

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
