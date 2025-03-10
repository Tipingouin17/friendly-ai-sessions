
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
  
  // Skip session full check for admin users - ALWAYS force canJoin=true
  if (isAdmin) {
    console.log("🔑 Admin user detected - bypassing ALL session full checks");
    return {
      canJoin: true,
      latestConversation,
      newParticipantId: (latestConversation.current_participants || 0) + 1
    };
  }
  
  // Only enforce the limit if maxParticipants is greater than 0
  if (latestConversation.participants > 0 && 
      latestConversation.current_participants >= latestConversation.participants) {
    console.log("Session is full, regular user cannot join:", {
      currentCount: latestConversation.current_participants,
      maxAllowed: latestConversation.participants
    });
    return {
      canJoin: false,
      latestConversation,
      newParticipantId: 0,
      error: "This session is full and cannot accept more participants."
    };
  }
  
  // For all users (admin handled above), we need to update the participant count
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
    console.log("Checking capacity with admin status:", isAdmin);
    
    try {
      const capacityResult = await checkSessionCapacity(conversationId, isAdmin);
      
      // For admin users, always force canJoin=true regardless of capacity result
      const effectiveCanJoin = isAdmin ? true : capacityResult.canJoin;
      
      if (effectiveCanJoin) {
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
      
      // For admin users, override canJoin to always be true
      if (isAdmin && !capacityResult.canJoin) {
        console.log("🔑 Admin override: forcing canJoin=true despite session being full");
        return {
          ...capacityResult,
          canJoin: true,
          error: undefined // Clear any error for admins
        };
      }
      
      return capacityResult;
    } catch (error) {
      setIsCheckingCapacity(false);
      
      // If admin user, catch the error but still allow joining
      if (isAdmin) {
        console.log("🔑 Admin exception handling: forcing success despite error:", error);
        return {
          canJoin: true,
          latestConversation: null,
          newParticipantId: 1, // Default to 1 for admin error case
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
