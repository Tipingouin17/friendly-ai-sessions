
import React, { useEffect } from 'react';
import { Clock, Users, CheckCircle, MessageCircle } from 'lucide-react';
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
  const [sessionStartDetected, setSessionStartDetected] = React.useState(false);
  const [welcomeMessageReceived, setWelcomeMessageReceived] = React.useState(false);
  const [isTransitioning, setIsTransitioning] = React.useState(false);
  
  console.log("ParticipantWaitingScreen props:", {
    conversationId,
    currentParticipantCount,
    maxParticipants,
    facilitatorTitle,
    sessionStarted
  });

  // Handle final redirect when both conditions are met
  const handleFinalRedirect = React.useCallback(() => {
    if (sessionStartDetected && welcomeMessageReceived && !isTransitioning) {
      console.log('Both conditions met - redirecting participant to session');
      setIsTransitioning(true);
      
      toast({
        title: "Session Ready",
        description: "Welcome message loaded! Joining the conversation..."
      });
      
      if (onSessionStarted) {
        setTimeout(() => {
          onSessionStarted();
        }, 1500);
      }
    }
  }, [sessionStartDetected, welcomeMessageReceived, isTransitioning, onSessionStarted, toast]);

  // Set up real-time listeners
  useEffect(() => {
    if (!conversationId) {
      console.log("No conversation ID provided to ParticipantWaitingScreen");
      return;
    }
    
    console.log("Setting up event-driven session detection for conversation:", conversationId);
    
    // Update initial count from props
    setParticipantCount(currentParticipantCount || 0);
    
    try {
      // Listen for conversation updates (session_started flag)
      const conversationChannel = supabase
        .channel(`conversation-updates-${conversationId}`)
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'conversations',
          filter: `id=eq.${conversationId}`
        }, (payload) => {
          console.log("Received conversation update:", payload);
          
          if (payload.new) {
            // Update participant count
            if (payload.new.current_participants !== null && payload.new.current_participants >= 0) {
              console.log("Updating participant count:", payload.new.current_participants);
              setParticipantCount(payload.new.current_participants);
            }
            
            // Check if session was started
            if (payload.new.session_started && (!payload.old || !payload.old.session_started)) {
              console.log("Session start detected via conversation update");
              setSessionStartDetected(true);
            }
          }
        })
        .subscribe((status) => {
          console.log(`Conversation updates channel status:`, status);
        });
      
      // Listen for welcome message INSERT events
      const messagesChannel = supabase
        .channel(`messages-insert-${conversationId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        }, (payload) => {
          console.log("Received message INSERT event:", payload);
          
          if (payload.new && payload.new.role === 'assistant') {
            // This is likely the welcome message from the facilitator
            console.log("Welcome message received via real-time INSERT");
            setWelcomeMessageReceived(true);
            
            toast({
              title: "Welcome Message Ready",
              description: "Your facilitator's message has been prepared!"
            });
          }
        })
        .subscribe((status) => {
          console.log(`Messages INSERT channel status:`, status);
        });
      
      // Also listen for session events for participant count updates
      const eventsChannel = supabase
        .channel(`session-events-${conversationId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'session_events',
          filter: `conversation_id=eq.${conversationId}`
        }, (payload) => {
          console.log("Received session event:", payload);
          
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
        removeChannel(messagesChannel);
        removeChannel(eventsChannel);
      };
    } catch (err) {
      console.error("Error setting up participant waiting subscriptions:", err);
      return () => {}; // Empty cleanup function to avoid runtime errors
    }
  }, [conversationId, currentParticipantCount]);

  // Trigger redirect when both conditions are met
  useEffect(() => {
    handleFinalRedirect();
  }, [handleFinalRedirect]);

  // Add timeout protection (30 seconds max wait after session start detected)
  useEffect(() => {
    if (sessionStartDetected && !welcomeMessageReceived && !isTransitioning) {
      console.log("Session started but no welcome message yet - setting timeout");
      
      const timeoutId = setTimeout(() => {
        if (!welcomeMessageReceived && !isTransitioning) {
          console.log("Timeout reached - proceeding without welcome message");
          
          toast({
            title: "Session Starting",
            description: "The session is ready. Joining now...",
            variant: "default"
          });
          
          setIsTransitioning(true);
          if (onSessionStarted) {
            setTimeout(() => {
              onSessionStarted();
            }, 1000);
          }
        }
      }, 30000); // 30 second timeout
      
      return () => clearTimeout(timeoutId);
    }
  }, [sessionStartDetected, welcomeMessageReceived, isTransitioning, onSessionStarted, toast]);

  // Ensure we always have a valid display value
  const displayCount = participantCount || 0;

  // Show transitioning state when both conditions are met
  if (isTransitioning) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FFC107]/5 to-white flex items-center justify-center py-6 sm:py-12 px-4">
        <div className="bg-white p-6 sm:p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
          
          <h2 className="text-xl sm:text-2xl font-bold mb-2">Session Ready!</h2>
          
          <p className="text-gray-600 mb-6">
            {welcomeMessageReceived 
              ? "Your facilitator's welcome message is ready. Joining the conversation now..."
              : "Joining the session now..."
            }
          </p>
          
          <div className="bg-green-50 border border-green-100 rounded-lg p-4 mb-6">
            <p className="text-green-800 font-medium">Joining conversation...</p>
            <div className="mt-2 h-2 bg-green-200 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full animate-pulse" style={{ width: '90%' }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show message preparation state when session started but no message yet
  if (sessionStartDetected && !welcomeMessageReceived) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FFC107]/5 to-white flex items-center justify-center py-6 sm:py-12 px-4">
        <div className="bg-white p-6 sm:p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto mb-6 bg-blue-100 rounded-full flex items-center justify-center">
            <MessageCircle className="h-8 w-8 text-blue-500 animate-pulse" />
          </div>
          
          <h2 className="text-xl sm:text-2xl font-bold mb-2">Preparing Your Session</h2>
          
          <p className="text-gray-600 mb-6">
            The facilitator is generating a personalized welcome message. This will just take a moment...
          </p>
          
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6">
            <p className="text-blue-800 font-medium">Generating welcome message...</p>
            <div className="mt-2 h-2 bg-blue-200 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full animate-pulse" style={{ width: '60%' }}></div>
            </div>
          </div>
          
          <p className="text-sm text-gray-500">
            Please wait while we prepare your personalized experience.
          </p>
        </div>
      </div>
    );
  }

  // Default waiting state - waiting for session to start
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
          <p className="text-amber-800 mb-2 font-medium">The host will start the session soon</p>
          <p className="text-amber-700 text-sm">Your facilitator will prepare a personalized welcome message when the session begins.</p>
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
