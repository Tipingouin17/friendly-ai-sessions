/**
 * use Anonymous State
 *
 * Hook for the AIfacilitator application.
 */

import { useState, useEffect } from "react";
import api from "@/lib/api";

type UseAnonymousStateProps = {
  conversationId: number | null;
  currentParticipantId: number | null;
};

export function useAnonymousState({ conversationId, currentParticipantId }: UseAnonymousStateProps) {
  const [isAnonymous, setIsAnonymous] = useState(false);

  // Load anonymous preference on initial mount
  useEffect(() => {
    if (conversationId && currentParticipantId) {
      const loadAnonymousSetting = async () => {
        try {
          const { data, error } = await api
            .from('session_participants')
            .select('is_anonymous')
            .eq('conversation_id', conversationId)
            .eq('participant_id', currentParticipantId)
            .single();
            
          if (error) {
            console.error("Error loading anonymous setting:", error);
            return;
          }
          
          if (data) {
            setIsAnonymous(data.is_anonymous || false);
          }
        } catch (error) {
          console.error("Failed to load anonymous setting:", error);
        }
      };
      
      loadAnonymousSetting();
    }
  }, [conversationId, currentParticipantId]);

  // Toggle anonymous status and update in database
  const toggleAnonymous = async () => {
    if (!conversationId || !currentParticipantId) return;
    
    const newValue = !isAnonymous;
    setIsAnonymous(newValue);
    
    try {
      const { error } = await api
        .from('session_participants')
        .update({ is_anonymous: newValue })
        .eq('conversation_id', conversationId)
        .eq('participant_id', currentParticipantId);
        
      if (error) {
        console.error("Error updating anonymous setting:", error);
        // Revert UI state if update failed
        setIsAnonymous(!newValue);
      }
    } catch (error) {
      console.error("Failed to update anonymous setting:", error);
      // Revert UI state if update failed
      setIsAnonymous(!newValue);
    }
  };

  return {
    isAnonymous,
    toggleAnonymous
  };
}
