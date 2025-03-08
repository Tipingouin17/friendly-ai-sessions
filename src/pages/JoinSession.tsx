
import { useSearchParams } from "react-router-dom";
import { useJoinSessionData } from "@/hooks/useJoinSessionData";
import JoinForm from "@/components/session/JoinForm";
import SessionFullAlert from "@/components/session/SessionFullAlert";
import JoinSessionLoadingState from "@/components/session/JoinSessionLoadingState";

const JoinSession = () => {
  const [searchParams] = useSearchParams();
  const conversationId = searchParams.get("id") ? Number(searchParams.get("id")) : null;
  
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
