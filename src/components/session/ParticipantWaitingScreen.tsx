
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
  onSessionStarted?: () => void; // Now means "participant is ready to proceed"
  sessionStarted?: boolean;
}

const ParticipantWaitingScreen: React.FC<ParticipantWaitingScreenProps> = ({
  conversationId,
  currentParticipantCount,
  maxParticipants,
  facilitatorTitle,
  onSessionStarted, // This is now the "participant ready" callback
  sessionStarted = false
}) => {
  const { toast } = useToast();
  const [participantCount, setParticipantCount] = React.useState(currentParticipantCount || 0);
  const [sessionStartDetected, setSessionStartDetected] = React.useState(false);
  const [welcomeMessageReceived, setWelcomeMessageReceived] = React.useState(false);
  const [isTransitioning, setIsTransitioning] = React.useState(false);
  const [checkedInitialState, setCheckedInitialState] = React.useState(false);
  
  console.log("ParticipantWaitingScreen props:", {
    conversationId,
    currentParticipantCount,
    maxParticipants,
    facilitatorTitle,
    sessionStarted
  });

  // HYBRID DETECTION: Check existing state on component mount (for late joiners)
  const checkInitialSessionState = React.useCallback(async () => {
    if (!conversationId || checkedInitialState) return;
    
    console.log('🔍 HYBRID: Checking initial session state for late joiners');
    
    try {
      // Check if session is already started
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select('session_started')
        .eq('id', conversationId)
        .single();
        
      if (convError) {
        console.error('Error checking conversation state:', convError);
        return;
      }
      
      const isSessionStarted = Boolean(conversation?.session_started);
      console.log('🔍 HYBRID: Initial session_started state =', isSessionStarted);
      
      if (isSessionStarted) {
        setSessionStartDetected(true);
        
        // Check if welcome message already exists
        const { data: messages, error: msgError } = await supabase
          .from('messages')
          .select('id, role, created_at')
          .eq('conversation_id', conversationId)
          .eq('role', 'assistant')
          .order('created_at', { ascending: true })
          .limit(1);
          
        if (msgError) {
          console.error('Error checking for welcome message:', msgError);
        } else if (messages && messages.length > 0) {
          console.log('🔍 HYBRID: Found existing welcome message - late joiner can proceed immediately');
          setWelcomeMessageReceived(true);
          
          toast({
            title: "Session Ready",
            description: "Welcome message found! You can join the conversation.",
          });
        } else {
          console.log('🔍 HYBRID: Session started but no welcome message yet - will wait for real-time event');
        }
      }
      
    } catch (error) {
      console.error('Error in hybrid initial state check:', error);
    } finally {
      setCheckedInitialState(true);
    }
  }, [conversationId, checkedInitialState, toast]);

  // Run hybrid check on mount
  useEffect(() => {
    checkInitialSessionState();
  }, [checkInitialSessionState]);

  // PARTICIPANT SELF-DETERMINATION: Only proceed when BOTH conditions are met
  const handleParticipantReadyToProceed = React.useCallback(() => {
    if (sessionStartDetected && welcomeMessageReceived && !isTransitioning && checkedInitialState) {
      console.log('🎯 PARTICIPANT READY: Both session started AND welcome message received');
      setIsTransitioning(true);
      
      toast({
        title: "Ready to Join",
        description: "Welcome message loaded! You're ready to join the conversation.",
      });
      
      // Signal to parent that THIS PARTICIPANT is ready to proceed
      if (onSessionStarted) {
        setTimeout(() => {
          console.log('🚀 Calling participant ready callback');
          onSessionStarted(); // This tells SessionViewSelector that participant is ready
        }, 1500);
      }
    }
  }, [sessionStartDetected, welcomeMessageReceived, isTransitioning, checkedInitialState, onSessionStarted, toast]);

  // Set up real-time listeners for participant self-determination
  useEffect(() => {
    if (!conversationId || !checkedInitialState) {
      console.log("Not setting up real-time listeners yet - waiting for initial state check");
      return;
    }
    
    console.log("🔄 Setting up participant real-time listeners for conversation:", conversationId);
    
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
            
            // Check if session was started (only if not already detected)
            if (payload.new.session_started && (!payload.old || !payload.old.session_started) && !sessionStartDetected) {
              console.log("🚦 Real-time session start detected - participant waits for welcome message");
              setSessionStartDetected(true);
            }
          }
        })
        .subscribe((status) => {
          console.log(`Conversation updates channel status:`, status);
        });
      
      // Listen for welcome message INSERT events - THIS IS THE KEY
      const messagesChannel = supabase
        .channel(`messages-insert-${conversationId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        }, (payload) => {
          console.log("Received message INSERT event:", payload);
          
          if (payload.new && payload.new.role === 'assistant' && !welcomeMessageReceived) {
            console.log("✅ Welcome message confirmed received via real-time INSERT");
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
  }, [conversationId, currentParticipantCount, checkedInitialState, sessionStartDetected, welcomeMessageReceived]);

  // Trigger participant ready check when conditions change
  useEffect(() => {
    handleParticipantReadyToProceed();
  }, [handleParticipantReadyToProceed]);

  // Add timeout protection (30 seconds max wait after session start detected)
  useEffect(() => {
    if (sessionStartDetected && !welcomeMessageReceived && !isTransitioning) {
      console.log("Session started but no welcome message yet - setting safety timeout");
      
      const timeoutId = setTimeout(() => {
        if (!welcomeMessageReceived && !isTransitioning) {
          console.log("⏰ Safety timeout reached - proceeding without welcome message confirmation");
          
          toast({
            title: "Session Starting",
            description: "The session is ready. Joining now...",
            variant: "default"
          });
          
          setWelcomeMessageReceived(true); // Force trigger the ready state
        }
      }, 30000); // 30 second safety timeout
      
      return () => clearTimeout(timeoutId);
    }
  }, [sessionStartDetected, welcomeMessageReceived, isTransitioning, toast]);

  // Ensure we always have a valid display value
  const displayCount = participantCount || 0;

  // Show loading state while checking initial state
  if (!checkedInitialState) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FFC107]/5 to-white flex items-center justify-center py-6 sm:py-12 px-4">
        <div className="bg-white p-6 sm:p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto mb-6 bg-blue-100 rounded-full flex items-center justify-center">
            <Clock className="h-8 w-8 text-blue-500 animate-pulse" />
          </div>
          
          <h2 className="text-xl sm:text-2xl font-bold mb-2">Checking Session Status</h2>
          
          <p className="text-gray-600 mb-6">
            Please wait while we check if the session is ready...
          </p>
        </div>
      </div>
    );
  }

  // Show final transition state when participant is ready to proceed
  if (isTransitioning) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FFC107]/5 to-white flex items-center justify-center py-6 sm:py-12 px-4">
        <div className="bg-white p-6 sm:p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
          
          <h2 className="text-xl sm:text-2xl font-bold mb-2">Ready to Join!</h2>
          
          <p className="text-gray-600 mb-6">
            {welcomeMessageReceived 
              ? "Your facilitator's welcome message is ready. Entering the conversation now..."
              : "Session resources confirmed. Joining now..."
            }
          </p>
          
          <div className="bg-green-50 border border-green-100 rounded-lg p-4 mb-6">
            <p className="text-green-800 font-medium">Entering conversation...</p>
            <div className="mt-2 h-2 bg-green-200 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full animate-pulse" style={{ width: '95%' }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show message preparation state when session started but waiting for welcome message
  if (sessionStartDetected && !welcomeMessageReceived) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FFC107]/5 to-white flex items-center justify-center py-6 sm:py-12 px-4">
        <div className="bg-white p-6 sm:p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto mb-6 bg-blue-100 rounded-full flex items-center justify-center">
            <MessageCircle className="h-8 w-8 text-blue-500 animate-pulse" />
          </div>
          
          <h2 className="text-xl sm:text-2xl font-bold mb-2">Session Started!</h2>
          
          <p className="text-gray-600 mb-6">
            The facilitator is preparing your personalized welcome message. This will just take a moment...
          </p>
          
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6">
            <p className="text-blue-800 font-medium">Preparing your welcome message...</p>
            <div className="mt-2 h-2 bg-blue-200 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full animate-pulse" style={{ width: '70%' }}></div>
            </div>
          </div>
          
          <p className="text-sm text-gray-500">
            Please wait while we prepare your personalized experience.
          </p>
        </div>
      </div>
    );
  }

  // Default waiting state - waiting for host to start session
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFC107]/5 to-white flex items-center justify-center py-6 sm:py-12 px-4">
      <div className="bg-white p-6 sm:p-8 rounded-lg shadow-lg max-w-md w-full text-center">
        <div className="w-16 h-16 mx-auto mb-6 bg-amber-100 rounded-full flex items-center justify-center">
          <Clock className="h-8 w-8 text-amber-500" />
        </div>
        
        <h2 className="text-xl sm:text-2xl font-bold mb-2">Waiting for Host</h2>
        
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
