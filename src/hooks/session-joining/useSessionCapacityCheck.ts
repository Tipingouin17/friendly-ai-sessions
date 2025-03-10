
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
  // First, fetch the latest count to avoid race conditions - for ALL users
  const { data: latestConversation, error: fetchError } = await supabase
    .from('conversations')
    .select('id, current_participants, participants')
    .eq('id', conversationId)
    .single();
    
  if (fetchError) {
    console.error("Error fetching latest conversation data:", fetchError);
    throw new Error(`Error fetching latest session data: ${fetchError.message}`);
  }
  
  if (!latestConversation) {
    throw new Error("Could not fetch the latest session data");
  }
  
  // Skip session full check for admin users
  if (!isAdmin) {
    // Only enforce the limit if maxParticipants is greater than 0
    if (latestConversation.participants > 0 && 
        latestConversation.current_participants >= latestConversation.participants) {
      return {
        canJoin: false,
        latestConversation,
        newParticipantId: 0,
        error: "This session is full and cannot accept more participants."
      };
    }
  } else {
    console.log("Admin user detected - bypassing ALL session full checks");
  }
  
  // For all users (admin or not), we need to update the participant count
  const latestCount = latestConversation.current_participants || 0;
  const newCount = latestCount + 1;
  console.log("Latest count from database:", latestCount, "New count will be:", newCount);
  
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
    
    try {
      const capacityResult = await checkSessionCapacity(conversationId, isAdmin);
      
      if (capacityResult.canJoin) {
        // Update the participant count with the latest calculated value
        const { data: updateData, error: updateError } = await supabase
          .from('conversations')
          .update({ current_participants: capacityResult.newParticipantId })
          .eq('id', conversationId)
          .select('current_participants')
          .single();
          
        if (updateError) {
          console.error("Error updating participant count:", updateError);
          throw new Error(`Failed to join: ${updateError.message}`);
        }

        if (!updateData) {
          throw new Error("Failed to update participant count");
        }

        console.log("Update response:", updateData);
      }
      
      setIsCheckingCapacity(false);
      return capacityResult;
    } catch (error) {
      setIsCheckingCapacity(false);
      throw error;
    }
  };
  
  return {
    isCheckingCapacity,
    checkCapacityAndUpdate
  };
}
