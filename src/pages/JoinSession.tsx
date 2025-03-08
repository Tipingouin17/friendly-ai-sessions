
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useConversation } from "@/hooks/useConversation";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UserRound, ArrowRight, AlertCircle, Users } from "lucide-react";
import BoringAvatar from 'boring-avatars';
import { usePlanLimits } from "@/hooks/usePlanLimits";

const JoinSession = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const conversationId = searchParams.get("id") ? Number(searchParams.get("id")) : null;
  
  const [participantName, setParticipantName] = useState("");
  const [avatarSeed, setAvatarSeed] = useState(Math.random().toString());
  const [isJoining, setIsJoining] = useState(false);
  const [currentParticipantCount, setCurrentParticipantCount] = useState(0);
  const [maxParticipantsForSession, setMaxParticipantsForSession] = useState(0);
  
  // Fetch plan limits as fallback
  const { maxParticipants: planMaxParticipants } = usePlanLimits();
  
  // Fetch conversation data to show facilitator info
  const { data: conversation, isLoading, error } = useConversation(conversationId);

  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: "Session not found or no longer available.",
        variant: "destructive",
      });
      navigate("/");
    }
  }, [error, navigate, toast]);

  useEffect(() => {
    // Set conversation-specific data once it's loaded
    if (conversation) {
      console.log("Conversation data loaded:", conversation);
      
      // Set the maximum participants for this specific session
      if (conversation.participants !== null && conversation.participants > 0) {
        setMaxParticipantsForSession(conversation.participants);
      }
      
      // Set the current participants count
      if (conversation.current_participants !== null && conversation.current_participants >= 0) {
        setCurrentParticipantCount(conversation.current_participants);
      }
    }
  }, [conversation]);

  useEffect(() => {
    // Set up real-time subscription to track changes to participants
    if (conversationId) {
      console.log("Setting up realtime subscription for conversation:", conversationId);
      
      const channel = supabase
        .channel(`conversation-${conversationId}`)
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'conversations',
          filter: `id=eq.${conversationId}`
        }, (payload) => {
          console.log("Received realtime update:", payload);
          
          if (payload.new) {
            // Update max participants if available
            if (payload.new.participants !== null && payload.new.participants > 0) {
              setMaxParticipantsForSession(payload.new.participants);
            }
            
            // Update current participants count
            if (payload.new.current_participants !== null && payload.new.current_participants >= 0) {
              setCurrentParticipantCount(payload.new.current_participants);
              
              // If session is full, show a toast and redirect to session
              const effectiveMax = payload.new.participants || planMaxParticipants;
              if (effectiveMax > 0 && payload.new.current_participants >= effectiveMax) {
                toast({
                  title: "Session is full",
                  description: `This session has reached its maximum capacity of ${effectiveMax} participants.`,
                  variant: "destructive",
                });
                
                // Automatically join the session with a default name if one isn't provided
                if (!isJoining) {
                  const autoName = participantName.trim() || `Guest ${Math.floor(Math.random() * 1000)}`;
                  navigateToSession(autoName, payload.new.current_participants);
                }
              }
            }
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [conversationId, planMaxParticipants, toast, participantName, isJoining]);

  const navigateToSession = (name, participantId) => {
    console.log(`Navigating to session with name: ${name}, participantId: ${participantId}`);
    
    navigate(`/session?id=${conversationId}`, {
      state: { 
        participantName: name,
        avatarSeed,
        isGuest: true,
        participantId: participantId
      }
    });
  };

  const handleJoinSession = async () => {
    if (!participantName.trim()) {
      toast({
        title: "Please enter your name",
        description: "A name is required to join the session.",
        variant: "destructive",
      });
      return;
    }

    // Use session-specific max or fall back to plan limit
    const effectiveMaxParticipants = maxParticipantsForSession > 0 ? 
      maxParticipantsForSession : planMaxParticipants;

    // Check if the session is full
    if (currentParticipantCount >= effectiveMaxParticipants) {
      toast({
        title: "Session is full",
        description: `This session has reached its maximum capacity of ${effectiveMaxParticipants} participants.`,
        variant: "destructive",
      });
      return;
    }

    setIsJoining(true);

    try {
      console.log("Current participant count before update:", currentParticipantCount);
      
      // Increment the current participant count in the conversation
      const { data, error: updateError } = await supabase
        .from('conversations')
        .update({ 
          current_participants: currentParticipantCount + 1 
        })
        .eq('id', conversationId)
        .select('current_participants')
        .single();
        
      if (updateError) {
        throw updateError;
      }

      console.log("Update response:", data);
      
      // Navigate to the session with the participant info
      // Use the returned current_participants value as the participant ID to ensure uniqueness
      const newParticipantId = data.current_participants;
      navigateToSession(participantName, newParticipantId);
      
    } catch (error) {
      console.error("Error joining session:", error);
      toast({
        title: "Error",
        description: "Failed to join the session. Please try again.",
        variant: "destructive",
      });
      setIsJoining(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FFC107]/5 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-t-2 border-purple-500 border-solid rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading session information...</p>
        </div>
      </div>
    );
  }

  // Use session-specific max participants or fall back to plan limit
  const effectiveMaxParticipants = maxParticipantsForSession > 0 ? 
    maxParticipantsForSession : planMaxParticipants;
    
  // Only consider full if the max is greater than 0 and we've reached it
  const isFull = effectiveMaxParticipants > 0 && currentParticipantCount >= effectiveMaxParticipants;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFC107]/5 to-white flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold mb-2">Join Session</h1>
          {conversation?.sessions?.facilitator_details && (
            <p className="text-gray-600">
              You're joining a session with {conversation.sessions.facilitator_details.title || "Facilitator"}
            </p>
          )}
          
          {isFull && (
            <Alert variant="warning" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center">
                <span>This session is full ({effectiveMaxParticipants} participants maximum)</span>
              </AlertDescription>
            </Alert>
          )}
        </div>

        {!isFull ? (
          <>
            <div className="flex justify-center mb-6">
              <div className="cursor-pointer" onClick={() => setAvatarSeed(Math.random().toString())}>
                <BoringAvatar
                  size={80}
                  name={avatarSeed}
                  variant="beam"
                  colors={['#92A1C6', '#146A7C', '#F0AB3D', '#C271B4', '#C20D90']}
                />
                <p className="text-xs text-center mt-1 text-gray-500">Click to change</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Your Name
                </label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your name"
                  value={participantName}
                  onChange={(e) => setParticipantName(e.target.value)}
                  className="w-full"
                />
              </div>

              <Button 
                onClick={handleJoinSession} 
                className="w-full bg-[#FFC107] hover:bg-[#F5B800] text-black"
                disabled={isJoining || isFull}
              >
                {isJoining ? (
                  <span className="flex items-center justify-center">
                    <span className="w-4 h-4 border-t-2 border-black border-solid rounded-full animate-spin mr-2"></span>
                    Joining...
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    Join Session <ArrowRight className="ml-2 w-4 h-4" />
                  </span>
                )}
              </Button>
              
              <div className="text-center text-xs text-gray-500 flex items-center justify-center gap-1">
                <Users className="w-3.5 h-3.5" />
                <span>{currentParticipantCount} of {effectiveMaxParticipants} participants</span>
                {!isFull && effectiveMaxParticipants > 0 && (
                  <span className="text-green-600 font-medium">
                    ({effectiveMaxParticipants - currentParticipantCount} spots left)
                  </span>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center">
            <Button 
              onClick={() => navigate("/")} 
              className="mt-4 bg-[#FFC107] hover:bg-[#F5B800] text-black"
            >
              Return Home
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default JoinSession;
