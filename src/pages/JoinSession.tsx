
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
  
  // Fetch plan limits to check if there are available spots
  const { maxParticipants } = usePlanLimits();
  
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
    // Fetch the current number of participants in this session
    const fetchParticipantCount = async () => {
      if (!conversationId) return;
      
      try {
        // Query to get the participant count from the conversation
        const { data } = await supabase
          .from('conversations')
          .select('participants')
          .eq('id', conversationId)
          .single();
          
        if (data && data.participants !== null) {
          setCurrentParticipantCount(data.participants);
        }
      } catch (error) {
        console.error("Error fetching participant count:", error);
      }
    };
    
    fetchParticipantCount();

    // Set up real-time subscription to track changes to participants
    if (conversationId) {
      const subscription = supabase
        .channel(`conversation-${conversationId}`)
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'conversations',
          filter: `id=eq.${conversationId}`
        }, (payload) => {
          if (payload.new && payload.new.participants !== null) {
            setCurrentParticipantCount(payload.new.participants);
          }
        })
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [conversationId]);

  const handleJoinSession = async () => {
    if (!participantName.trim()) {
      toast({
        title: "Please enter your name",
        description: "A name is required to join the session.",
        variant: "destructive",
      });
      return;
    }

    // Check if the session is full
    if (currentParticipantCount >= maxParticipants) {
      toast({
        title: "Session is full",
        description: `This session has reached its maximum capacity of ${maxParticipants} participants.`,
        variant: "destructive",
      });
      return;
    }

    setIsJoining(true);

    try {
      // Increment the participant count in the conversation
      const { error: updateError } = await supabase
        .from('conversations')
        .update({ 
          participants: currentParticipantCount + 1 
        })
        .eq('id', conversationId);
        
      if (updateError) {
        throw updateError;
      }

      // Navigate to the session with the participant info
      navigate(`/session?id=${conversationId}`, {
        state: { 
          participantName,
          avatarSeed,
          isGuest: true
        }
      });
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

  const isFull = currentParticipantCount >= maxParticipants;

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
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center">
                <span>This session is full ({maxParticipants} participants maximum)</span>
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
                className="w-full"
                disabled={isJoining || isFull}
              >
                {isJoining ? (
                  <span className="flex items-center justify-center">
                    <span className="w-4 h-4 border-t-2 border-white border-solid rounded-full animate-spin mr-2"></span>
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
                <span>{currentParticipantCount} of {maxParticipants} participants</span>
                {!isFull && (
                  <span className="text-green-600 font-medium">
                    ({maxParticipants - currentParticipantCount} spots left)
                  </span>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center">
            <Button onClick={() => navigate("/")} className="mt-4">
              Return Home
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default JoinSession;
