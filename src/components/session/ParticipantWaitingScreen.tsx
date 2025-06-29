
import React, { useEffect } from 'react';
import { Clock, Users, CheckCircle } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { removeChannel } from "@/utils/realtimeHelpers";

interface ParticipantWaitingScreenProps {
  conversationId?: number | null;
  currentParticipantCount: number;
  maxParticipants?: number;
  facilitatorTitle?: string;
  onSessionStarted?: () => void;
  sessionStarted?: boolean;
}

const ParticipantWaitingScreen: React.FC<ParticipantWaitingScreenProps> = ({
  conversationId,
  currentParticipantCount,
  maxParticipants,
  facilitatorTitle,
  onSessionStarted,
  sessionStarted = false
}) => {
  const { toast } = useToast();
  const [participantCount, setParticipantCount] = React.useState(currentParticipantCount || 0);
  const [sessionStarting, setSessionStarting] = React.useState(false);
  
  console.log("ParticipantWaitingScreen props:", {
    conversationId,
    currentParticipantCount,
    maxParticipants,
    facilitatorTitle,
    sessionStarted
  });
  
  // Set up real-time listener for conversation updates
  useEffect(() => {
    if (!conversationId) {
      console.log("No conversation ID provided to ParticipantWaitingScreen");
      return;
    }
    
    console.log("Setting up realtime subscription for participant waiting screen:", conversationId);
    
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
          console.log("Received conversation update in participant waiting screen:", payload);
          
          if (payload.new) {
            // Update participant count
            if (payload.new.current_participants !== null && payload.new.current_participants >= 0) {
              console.log("Updating participant count from conversation update:", payload.new.current_participants);
              setParticipantCount(payload.new.current_participants);
            }
            
            // Check if session was started
            if (payload.new.session_started && (!payload.old || !payload.old.session_started)) {
              console.log("Session was started, showing transition state");
              setSessionStarting(true);
              
              toast({
                title: "Session Starting",
                description: "The session is starting! Please wait while we load your conversation..."
              });
              
              if (onSessionStarted) {
                // Small delay to show the transition state
                setTimeout(() => {
                  onSessionStarted();
                }, 1500);
              }
            }
          }
        })
        .subscribe((status) => {
          console.log(`Conversation updates channel status:`, status);
        });
      
      // Also listen for session events for more immediate updates
      const eventsChannel = supabase
        .channel(`session-events-${conversationId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'session_events',
          filter: `conversation_id=eq.${conversationId}`
        }, (payload) => {
          console.log("Received session event in participant waiting screen:", payload);
          
          if (payload.new && payload.new.event_type === 'participant_joined') {
            const eventData = payload.new.data;
            if (eventData && eventData.current_count !== undefined) {
              console.log("Updating participant count from event:", eventData.current_count);
              setParticipantCount(eventData.current_count);
            }
          }
        })
        .subscribe((status) => {
          console.log(`Session events channel status:`, status);
        });
      
      return () => {
        console.log("Cleaning up participant waiting screen channels");
        removeChannel(conversationChannel);
        removeChannel(eventsChannel);
      };
    } catch (err) {
      console.error("Error setting up participant waiting subscription:", err);
      return () => {}; // Empty cleanup function to avoid runtime errors
    }
  }, [conversationId, currentParticipantCount, onSessionStarted, toast]);

  // Ensure we always have a valid display value
  const displayCount = participantCount || 0;

  // Show session starting state
  if (sessionStarting) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FFC107]/5 to-white flex items-center justify-center py-6 sm:py-12 px-4">
        <div className="bg-white p-6 sm:p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
          
          <h2 className="text-xl sm:text-2xl font-bold mb-2">Session Starting!</h2>
          
          <p className="text-gray-600 mb-6">
            Your session is now beginning. Please wait a moment while we prepare your conversation...
          </p>
          
          <div className="bg-green-50 border border-green-100 rounded-lg p-4 mb-6">
            <p className="text-green-800 font-medium">Loading your conversation...</p>
            <div className="mt-2 h-2 bg-green-200 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full animate-pulse" style={{ width: '70%' }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFC107]/5 to-white flex items-center justify-center py-6 sm:py-12 px-4">
      <div className="bg-white p-6 sm:p-8 rounded-lg shadow-lg max-w-md w-full text-center">
        <div className="w-16 h-16 mx-auto mb-6 bg-amber-100 rounded-full flex items-center justify-center">
          <Clock className="h-8 w-8 text-amber-500" />
        </div>
        
        <h2 className="text-xl sm:text-2xl font-bold mb-2">Waiting for Session to Begin</h2>
        
        <p className="text-gray-600 mb-6">
          {facilitatorTitle 
            ? `You've joined the session with ${facilitatorTitle}` 
            : 'You have successfully joined the session'}
        </p>
        
        <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 mb-6">
          <p className="text-amber-800 mb-2 font-medium">The admin will start the session soon</p>
          <p className="text-amber-700 text-sm">Please stay on this page. The session will begin automatically.</p>
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
