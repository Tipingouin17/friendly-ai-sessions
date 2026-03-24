
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ConversationWithSession } from "@/types/database";

interface SessionCapacityResult {
  canJoin: boolean;
  latestConversation: any;
  newParticipantId: number;
  error?: string;
}

export async function checkSessionCapacity(
  conversationId: number,
  isAdmin: boolean = false
): Promise<SessionCapacityResult> {
  
  // Check if on admin route for stronger admin override
  const isOnAdminPath = window.location.pathname.includes('/admin');
  const effectiveIsAdmin = isAdmin || isOnAdminPath;
  
  const { data: latestConversation, error: fetchError } = await supabase
    .from('conversations')
    .select('id, current_participants, participants')
    .eq('id', conversationId)
    .single();
    
  if (fetchError) {
    console.error("Error fetching latest conversation data:", fetchError);
    
    // For admin route, return success even if error occurs
    if (isOnAdminPath) {
      return {
        canJoin: true,
        latestConversation: null,
        newParticipantId: 1
      };
    }
    
    throw new Error(`Error fetching latest session data: ${fetchError.message}`);
  }
  
  if (!latestConversation) {
    // For admin route, allow joining even without conversation data
    if (isOnAdminPath) {
      return {
        canJoin: true,
        latestConversation: null, 
        newParticipantId: 1
      };
    }
    
    throw new Error("Could not fetch the latest session data");
  }
  
  // Get actual participant count from session_participants table
  const { data: actualParticipants, error: participantsError } = await supabase
    .from('session_participants')
    .select('participant_id')
    .eq('conversation_id', conversationId);
    
  if (participantsError) {
    console.error("Error fetching actual participants:", participantsError);
  }
  
  const actualCount = actualParticipants?.length || 0;
  
  // Calculate the next participant ID
  const nextParticipantId = actualCount + 1;
  
  if (effectiveIsAdmin) {
    return {
      canJoin: true,
      latestConversation,
      newParticipantId: nextParticipantId
    };
  }
  
  const maxAllowed = latestConversation.participants || 0;
  
  // FIXED: Use actual count for capacity check, not the stored current_participants
  if (maxAllowed > 0 && actualCount >= maxAllowed) {
    
    const { error: startError } = await supabase
      .from('conversations')
      .update({ session_started: true })
      .eq('id', conversationId);
      
    if (startError) {
      console.error("Error auto-starting session:", startError);
    } else { /* no-op */ }
    
    return {
      canJoin: false,
      latestConversation,
      newParticipantId: 0,
      error: "This session is full and cannot accept more participants."
    };
  }
  
  return {
    canJoin: true,
    latestConversation,
    newParticipantId: nextParticipantId
  };
}

export function useSessionCapacityCheck() {
  const [isCheckingCapacity, setIsCheckingCapacity] = useState(false);
  
  const checkCapacityAndUpdate = async (
    conversationId: number,
    isAdmin: boolean = false
  ): Promise<SessionCapacityResult> => {
    setIsCheckingCapacity(true);
    
    // Check if on admin route for stronger admin override
    const isOnAdminPath = window.location.pathname.includes('/admin');
    const effectiveIsAdmin = isAdmin || isOnAdminPath;
    
    try {
      const capacityResult = await checkSessionCapacity(conversationId, effectiveIsAdmin);
      
      // If on admin route, always allow joining regardless of capacity
      const finalCanJoin = isOnAdminPath ? true : (effectiveIsAdmin ? true : capacityResult.canJoin);
      
      // FIXED: Only update count if participant can actually join
      if (finalCanJoin) {
        
        // Don't update the count here - it will be updated after successful participant registration
        // This prevents count inflation when join attempts fail
        
        try {
          const { error: broadcastError } = await supabase
            .from('session_events')
            .insert({
              conversation_id: conversationId,
              event_type: 'participant_joining',
              data: { 
                participant_id: capacityResult.newParticipantId,
                timestamp: new Date().toISOString()
              }
            });
            
          if (broadcastError) {
            console.error("Error broadcasting participant joining event:", broadcastError);
          } else { /* no-op */ }
        } catch (broadcastErr) {
          console.error("Exception broadcasting joining event:", broadcastErr);
        }
      }
      
      setIsCheckingCapacity(false);
      
      if (effectiveIsAdmin && !capacityResult.canJoin) {
        return {
          ...capacityResult,
          canJoin: true,
          error: undefined
        };
      }
      
      return {
        ...capacityResult,
        canJoin: finalCanJoin
      };
    } catch (error) {
      setIsCheckingCapacity(false);
      
      if (effectiveIsAdmin) {
        return {
          canJoin: true,
          latestConversation: null,
          newParticipantId: 1,
          error: undefined
        };
      }
      
      throw error;
    }
  };
  
  return {
    isCheckingCapacity,
    checkCapacityAndUpdate
  };
}
