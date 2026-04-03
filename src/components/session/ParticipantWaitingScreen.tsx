/**
 * Participant Waiting Screen
 *
 * Session component for the AIfacilitator application.
 */

import React, { useEffect } from 'react';
import { Clock, Users } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { removeChannel } from "@/utils/realtimeHelpers";

interface ParticipantWaitingScreenProps {
  conversationId?: number | null;
  currentParticipantCount: number;
  maxParticipants?: number;
  facilitatorTitle?: string;
  onSessionStarted?: () => void;
}

const ParticipantWaitingScreen: React.FC<ParticipantWaitingScreenProps> = ({
  conversationId,
  currentParticipantCount,
  maxParticipants,
  facilitatorTitle,
  onSessionStarted
}) => {
  const { toast } = useToast();
  const [participantCount, setParticipantCount] = React.useState(currentParticipantCount || 0);
  
  // Debug log to verify props
  
  // Set up real-time listener for conversation updates
  useEffect(() => {
    if (!conversationId) {
      return;
    }
    
    // Update initial count from props
    setParticipantCount(currentParticipantCount || 0);
    
    try {
      // Listen for conversation changes
      const conversationChannel = supabase
        .channel(`conversation-updates-${conversationId}`)
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'conversations',
          filter: `id=eq.${conversationId}`
        }, (payload) => {
          
          if (payload.new) {
            // Update participant count
            if (payload.new.current_participants !== null && payload.new.current_participants >= 0) {
              setParticipantCount(payload.new.current_participants);
            }
            
            // Check if session was started
            if (payload.new.session_started && (!payload.old || !payload.old.session_started)) {
              toast({
                title: "Session Started",
                description: "The session has been started by the admin."
              });
              
              if (onSessionStarted) {
                setTimeout(() => {
                  onSessionStarted();
                }, 1000); // Short delay to ensure toast is shown
              }
            }
          }
        })
        .subscribe((status) => { /* no-op */ });
      
      // Also listen for session events for more immediate updates
      const eventsChannel = supabase
        .channel(`session-events-${conversationId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'session_events',
          filter: `conversation_id=eq.${conversationId}`
        }, (payload) => {
          
          if (payload.new && payload.new.event_type === 'participant_joined') {
            const eventData = payload.new.data;
            if (eventData && eventData.current_count !== undefined) {
              setParticipantCount(eventData.current_count);
            }
          }
        })
        .subscribe((status) => { /* no-op */ });
      
      return () => {
        removeChannel(conversationChannel);
        removeChannel(eventsChannel);
      };
    } catch (err) {
      console.error("Error setting up participant waiting subscription:", err);
      return () => { /* no-op */ }; // Empty cleanup function to avoid runtime errors
    }
  }, [conversationId, currentParticipantCount, onSessionStarted, toast]);

  // Ensure we always have a valid display value
  const displayCount = participantCount || 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/50 to-white flex items-center justify-center py-6 sm:py-12 px-4">
      <div className="bg-white p-6 sm:p-8 rounded-lg shadow-lg max-w-md w-full text-center">
        <div className="w-16 h-16 mx-auto mb-6 bg-indigo-100 rounded-full flex items-center justify-center">
          <Clock className="h-8 w-8 text-indigo-500" />
        </div>
        
        <h2 className="text-xl sm:text-2xl font-bold mb-2">Waiting for Session to Begin</h2>
        
        <p className="text-gray-600 mb-6">
          {facilitatorTitle 
            ? `You've joined the session with ${facilitatorTitle}` 
            : 'You have successfully joined the session'}
        </p>
        
        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 mb-6">
          <p className="text-indigo-800 mb-2 font-medium">The admin will start the session soon</p>
          <p className="text-indigo-700 text-sm">Please stay on this page. The session will begin automatically.</p>
        </div>
        
        <div className="inline-flex items-center gap-2 bg-gray-50 rounded-full px-4 py-2 border">
          <Users className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium">
            {displayCount} {maxParticipants ? `of ${maxParticipants}` : ''} participants joined
          </span>
        </div>
      </div>
    </div>
  );
};

export default ParticipantWaitingScreen;
