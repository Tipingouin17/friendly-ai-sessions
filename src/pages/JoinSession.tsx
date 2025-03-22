
import { useSearchParams } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { useJoinSessionData } from "@/hooks/useJoinSessionData";
import JoinForm from "@/components/session/JoinForm";
import SessionFullAlert from "@/components/session/SessionFullAlert";
import JoinSessionLoadingState from "@/components/session/JoinSessionLoadingState";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, RefreshCw, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useParticipantPersistence } from "@/hooks/useParticipantPersistence";
import { useNavigateToSession } from "@/hooks/session-joining/useNavigateToSession";

const JoinSession = () => {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [invalidRequest, setInvalidRequest] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  
  // Safely parse the conversation ID from URL
  const idParam = searchParams.get("id");
  const conversationId = idParam && !isNaN(Number(idParam)) ? Number(idParam) : null;
  
  // Participant persistence hooks
  const { getSessionByConversationId } = useParticipantPersistence();
  const { navigateToSession } = useNavigateToSession();
  
  // Check for existing session data
  const existingSessionData = conversationId ? getSessionByConversationId(conversationId) : null;
  const [showRejoinPrompt, setShowRejoinPrompt] = useState(!!existingSessionData);
  
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
  
  // Handle rejoining the session with existing data
  const handleRejoin = useCallback(() => {
    if (existingSessionData && conversationId) {
      console.log("Rejoining session with existing data:", existingSessionData);
      navigateToSession(
        conversationId,
        existingSessionData.name || "Participant",
        existingSessionData.participantId,
        existingSessionData.avatarSeed || "",
        existingSessionData.isAdmin || false
      );
    }
  }, [existingSessionData, conversationId, navigateToSession]);
  
  // Handle joining as a new participant
  const handleJoinAsNew = useCallback(() => {
    setShowRejoinPrompt(false);
  }, []);
  
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

  // Pre-fill participant name from existing session data
  useEffect(() => {
    if (existingSessionData?.name && !participantName) {
      setParticipantName(existingSessionData.name);
    }
  }, [existingSessionData, participantName, setParticipantName]);

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

  // Show rejoin prompt if we have existing session data
  if (showRejoinPrompt && existingSessionData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FFC107]/5 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <UserCheck className="h-12 w-12 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Welcome Back!</h1>
            <p className="text-gray-600">
              You've previously joined this session as <span className="font-medium">{existingSessionData.name}</span>.
            </p>
          </div>

          <div className="space-y-4">
            <Button 
              onClick={handleRejoin} 
              className="w-full bg-[#FFC107] hover:bg-[#F5B800] text-black"
            >
              Rejoin as {existingSessionData.name}
            </Button>
            
            <div className="text-center">
              <Button 
                onClick={handleJoinAsNew}
                variant="ghost" 
                className="text-gray-500 hover:text-gray-800"
              >
                Join as a different participant
              </Button>
            </div>
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
