
import { useSearchParams } from "react-router-dom";
import { useEffect } from "react";
import { useJoinSessionData } from "@/hooks/useJoinSessionData";
import JoinForm from "@/components/session/JoinForm";
import SessionFullAlert from "@/components/session/SessionFullAlert";
import JoinSessionLoadingState from "@/components/session/JoinSessionLoadingState";
import { useQueryClient } from "@tanstack/react-query";

const JoinSession = () => {
  const [searchParams] = useSearchParams();
  const conversationId = searchParams.get("id") ? Number(searchParams.get("id")) : null;
  const queryClient = useQueryClient();
  
  // Force refresh conversation data when joining a session
  useEffect(() => {
    if (conversationId) {
      console.log("JoinSession: Invalidating queries and forcing refresh for conversation:", conversationId);
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
    } else {
      console.warn("JoinSession: No conversation ID found in URL parameters");
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
    handleJoinSession
  } = useJoinSessionData(conversationId);

  if (isLoading) {
    return <JoinSessionLoadingState />;
  }

  // If we have no conversation data and we're not loading, show error message
  if (!conversation && !isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FFC107]/5 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md text-center">
          <h1 className="text-2xl font-bold mb-4">Session Not Found</h1>
          <p className="text-gray-600 mb-6">
            The session you're trying to join doesn't exist or has been closed.
          </p>
          <a href="/" className="text-[#FFC107] hover:underline">
            Return to Home
          </a>
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

        {isFull ? (
          <SessionFullAlert />
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
