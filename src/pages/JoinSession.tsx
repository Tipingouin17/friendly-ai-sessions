
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useConversation } from "@/hooks/useConversation";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UserRound, ArrowRight } from "lucide-react";
import BoringAvatar from 'boring-avatars';

const JoinSession = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const conversationId = searchParams.get("id") ? Number(searchParams.get("id")) : null;
  
  const [participantName, setParticipantName] = useState("");
  const [avatarSeed, setAvatarSeed] = useState(Math.random().toString());
  const [isJoining, setIsJoining] = useState(false);
  
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

  const handleJoinSession = async () => {
    if (!participantName.trim()) {
      toast({
        title: "Please enter your name",
        description: "A name is required to join the session.",
        variant: "destructive",
      });
      return;
    }

    setIsJoining(true);

    try {
      // For this implementation, we'll just navigate to the session with the participant info
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
        </div>

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
            disabled={isJoining}
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
        </div>
      </div>
    </div>
  );
};

export default JoinSession;
