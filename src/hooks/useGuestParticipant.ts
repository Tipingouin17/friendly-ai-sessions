
import { useEffect } from "react";
import { ParticipantInfo } from "@/types/chat";
import { LocationStateType } from "@/hooks/useConversationId";

interface UseGuestParticipantProps {
  locationState: LocationStateType | null;
  setParticipants: React.Dispatch<React.SetStateAction<ParticipantInfo[]>>;
}

export function useGuestParticipant({
  locationState,
  setParticipants
}: UseGuestParticipantProps) {
  // Add participant from location state (for guests joining)
  useEffect(() => {
    if (locationState?.isGuest) {
      console.log("Guest participant joining with data:", locationState);
      
      if (locationState.participantName && locationState.participantId) {
        const avatarUrl = locationState.avatarSeed 
          ? `/api/avatar?name=${locationState.avatarSeed}&variant=beam&palette=0` 
          : null;
          
        setParticipants(prev => {
          const exists = prev.some(p => p.id === locationState.participantId);
          if (exists) return prev;
          
          console.log("Adding participant with ID:", locationState.participantId);
          console.log("Adding participant with name:", locationState.participantName);
          
          return [...prev, {
            id: locationState.participantId!,
            name: locationState.participantName!,
            avatar: avatarUrl,
            isAnonymous: false
          }];
        });
      }
    }
    
    // Return an empty cleanup function
    return () => {};
  }, [locationState, setParticipants]);
}
