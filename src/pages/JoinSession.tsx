import { useSearchParams } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { useJoinSessionData } from "@/hooks/useJoinSessionData";
import JoinForm from "@/components/session/JoinForm";
import SessionFullAlert from "@/components/session/SessionFullAlert";
import JoinSessionLoadingState from "@/components/session/JoinSessionLoadingState";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const JoinSession = () => {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [invalidRequest, setInvalidRequest] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  
  // Safely parse the conversation ID from URL
  const idParam = searchParams.get("id");
  const conversationId = idParam && !isNaN(Number(idParam)) ? Number(idParam) : null;
  
  // Validate that we have a valid conversation ID
  useEffect(() => {
    if (!conversationId) {
      console.error("No valid conversation ID found in URL parameters:", idParam);
      setInvalidRequest(true);
    } else {
      console.log("JoinSession: Using conversation ID:", conversationId);
      // Force invalidate any existing queries for this conversation
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
    }
  }, [conversationId, idParam, queryClient]);
  
  // Force refresh conversation data when joining a session
  useEffect(() => {
    if (conversationId) {
      console.log("JoinSession: Invalidating queries and forcing refresh for conversation:", conversationId);
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
      queryClient.refetchQueries({ queryKey: ['conversation', conversationId], exact: true });
    }
  }, [conversationId, queryClient, retryCount]);
  
  const handleRetry = useCallback(() => {
    if (conversationId) {
      console.log("Retrying connection to session:", conversationId);
      setRetryCount(prev => prev + 1);
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
      queryClient.refetchQueries({ queryKey: ['conversation', conversationId], exact: true, type: 'active' });
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
    return <JoinSessionLoadingState onRetry={handleRetry} error={error} />;
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
          <div className="mt-4">
            <Button
              onClick={handleRetry}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFC107]/5 to-white flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold mb-2">Join Session</h1>
          {conversation && conversation.sessions && conversation.sessions.facilitator_details && (
            <p className="text-gray-600">
              You're joining a session with {conversation.sessions.facilitator_details.title || "Facilitator"}
            </p>
          )}
        </div>

        {error ? (
          <div className="p-4 mb-4 border border-red-100 bg-red-50 rounded-md text-red-700">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
              <div>
                <p>{error}</p>
                <Button 
                  onClick={handleRetry}
                  className="mt-2 bg-red-100 hover:bg-red-200 text-red-800 text-sm py-1 px-2"
                  variant="ghost"
                  size="sm"
                >
                  Try Again
                </Button>
              </div>
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
