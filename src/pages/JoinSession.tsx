
import { useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useJoinSessionData } from "@/hooks/useJoinSessionData";
import JoinForm from "@/components/session/JoinForm";
import SessionFullAlert from "@/components/session/SessionFullAlert";
import JoinSessionLoadingState from "@/components/session/JoinSessionLoadingState";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";

const JoinSession = () => {
  const [searchParams] = useSearchParams();
  const conversationId = searchParams.get("id") ? Number(searchParams.get("id")) : null;
  const queryClient = useQueryClient();
  const [invalidRequest, setInvalidRequest] = useState(false);
  
  // Validate that we have a conversation ID
  useEffect(() => {
    if (!conversationId) {
      console.error("No conversation ID found in URL parameters");
      setInvalidRequest(true);
    }
  }, [conversationId]);
  
  // Force refresh conversation data when joining a session
  useEffect(() => {
    if (conversationId) {
      console.log("JoinSession: Invalidating queries and forcing refresh for conversation:", conversationId);
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
    }
  }, [conversationId, queryClient]);
  
  const {
    participantName,
    setParticipantName,
    avatarSeed,
    setAvatarSeed,
    isJoining,
    currentParticipantCount,
    effectiveMaxParticipants,
    isFull,
    conversation,
    isLoading,
    error,
    handleJoinSession
  } = useJoinSessionData(conversationId);

  // Show loading state when data is being fetched
  if (isLoading && !invalidRequest) {
    return <JoinSessionLoadingState />;
  }

  // Show error state if invalid request or no conversation data
  if (invalidRequest || (!conversation && !isLoading)) {
    console.error("Session not found or error:", error, "Conversation ID:", conversationId);
    
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FFC107]/5 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md text-center">
          <div className="mb-4 flex justify-center">
            <AlertCircle className="h-12 w-12 text-red-500" />
          </div>
          <SessionFullAlert 
            type="not-found" 
            message={error ? `Error: ${error}` : invalidRequest ? 
              "Invalid session link. Please make sure you have the correct URL." : 
              "The session you're trying to join doesn't exist or has been closed."} 
          />
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

        {error ? (
          <div className="p-4 mb-4 border border-red-100 bg-red-50 rounded-md text-red-700">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
              <p>{error}</p>
            </div>
          </div>
        ) : null}

        {isFull ? (
          <SessionFullAlert type="full" />
        ) : (
          <JoinForm
            participantName={participantName}
            onNameChange={(e) => setParticipantName(e.target.value)}
            avatarSeed={avatarSeed}
            onAvatarChange={() => setAvatarSeed(Math.random().toString())}
            onJoinSession={handleJoinSession}
            isJoining={isJoining}
            currentParticipantCount={currentParticipantCount}
            effectiveMaxParticipants={effectiveMaxParticipants}
          />
        )}
      </div>
    </div>
  );
};

export default JoinSession;
