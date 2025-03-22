
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
  console.log("Checking session capacity with admin status:", isAdmin);
  
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
      console.log("🔑 On admin route - bypassing fetch error");
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
      console.log("🔑 On admin route - bypassing missing conversation data");
      return {
        canJoin: true,
        latestConversation: null, 
        newParticipantId: 1
      };
    }
    
    throw new Error("Could not fetch the latest session data");
  }
  
  if (effectiveIsAdmin) {
    console.log("🔑 Admin user detected - bypassing ALL session full checks");
    return {
      canJoin: true,
      latestConversation,
      newParticipantId: (latestConversation.current_participants || 0) + 1
    };
  }
  
  const currentCount = latestConversation.current_participants || 0;
  const maxAllowed = latestConversation.participants || 0;
  
  if (maxAllowed > 0 && currentCount >= maxAllowed) {
    console.log("Session is full, starting automatically:", {
      currentCount,
      maxAllowed
    });
    
    const { error: startError } = await supabase
      .from('conversations')
      .update({ session_started: true })
      .eq('id', conversationId);
      
    if (startError) {
      console.error("Error auto-starting session:", startError);
    } else {
      console.log("Session auto-started successfully");
    }
    
    if (!effectiveIsAdmin) {
      return {
        canJoin: false,
        latestConversation,
        newParticipantId: 0,
        error: "This session is full and cannot accept more participants."
      };
    }
  }
  
  const newCount = currentCount + 1;
  console.log("Latest count from database:", currentCount, "New count will be:", newCount);
  
  return {
    canJoin: true,
    latestConversation,
    newParticipantId: newCount
  };
}

export function useSessionCapacityCheck() {
  const [isCheckingCapacity, setIsCheckingCapacity] = useState(false);
  
  const checkCapacityAndUpdate = async (
    conversationId: number,
    isAdmin: boolean = false
  ): Promise<SessionCapacityResult> => {
    setIsCheckingCapacity(true);
    console.log("Checking capacity with admin status:", isAdmin);
    
    // Check if on admin route for stronger admin override
    const isOnAdminPath = window.location.pathname.includes('/admin');
    const effectiveIsAdmin = isAdmin || isOnAdminPath;
    
    try {
      const capacityResult = await checkSessionCapacity(conversationId, effectiveIsAdmin);
      
      // If on admin route, always allow joining regardless of capacity
      const finalCanJoin = isOnAdminPath ? true : (effectiveIsAdmin ? true : capacityResult.canJoin);
      
      if (finalCanJoin) {
        const { data: updateData, error: updateError } = await supabase
          .from('conversations')
          .update({ current_participants: capacityResult.newParticipantId })
          .eq('id', conversationId)
          .select('current_participants')
          .single();
          
        if (updateError) {
          console.error("Error updating participant count:", updateError);
          
          // For admin route, continue even if update fails
          if (isOnAdminPath) {
            console.log("🔑 On admin route - bypassing update error");
            setIsCheckingCapacity(false);
            return {
              canJoin: true,
              latestConversation: capacityResult.latestConversation,
              newParticipantId: capacityResult.newParticipantId
            };
          }
          
          throw new Error(`Failed to join: ${updateError.message}`);
        }

        if (!updateData && !isOnAdminPath) {
          throw new Error("Failed to update participant count");
        }

        console.log("Update response:", updateData);
        
        try {
          const { error: broadcastError } = await supabase
            .from('session_events')
            .insert({
              conversation_id: conversationId,
              event_type: 'participant_joined',
              data: { 
                participant_id: capacityResult.newParticipantId,
                current_count: capacityResult.newParticipantId,
                timestamp: new Date().toISOString()
              }
            });
            
          if (broadcastError) {
            console.error("Error broadcasting participant join event:", broadcastError);
          } else {
            console.log("Successfully broadcast participant join event");
          }
        } catch (broadcastErr) {
          console.error("Exception broadcasting join event:", broadcastErr);
        }
      }
      
      setIsCheckingCapacity(false);
      
      if (effectiveIsAdmin && !capacityResult.canJoin) {
        console.log("🔑 Admin override: forcing canJoin=true despite session being full");
        return {
          ...capacityResult,
          canJoin: true,
          error: undefined
        };
      }
      
      return capacityResult;
    } catch (error) {
      setIsCheckingCapacity(false);
      
      if (effectiveIsAdmin) {
        console.log("🔑 Admin exception handling: forcing success despite error:", error);
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
