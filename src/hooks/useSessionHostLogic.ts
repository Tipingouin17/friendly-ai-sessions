
import { useState, useEffect, useCallback, useRef } from "react";
import { useConversationId } from "@/hooks/useConversationId";
import { useConversation } from "@/hooks/useConversation";
import { useHostParticipantManager } from "@/hooks/useHostParticipantManager";
import { useHostMessages } from "@/hooks/useHostMessages";
import { useHostStatusPersistence } from "@/hooks/useHostStatusPersistence";
import { useSessionInterface } from "@/hooks/useSessionInterface";
import { useAutoStartSession } from "@/hooks/useAutoStartSession";
import { Message } from "@/types/chat";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";

export function useSessionHostLogic() {
    const { currentConversationId, locationState } = useConversationId();
    const { toast } = useToast();
    const navigate = useNavigate();
    const { forceHost } = useHostStatusPersistence();

    // Force host status immediately
    useEffect(() => {
        if (currentConversationId) {
            forceHost();
            sessionStorage.removeItem('isAdminSession');
            sessionStorage.setItem('isHostSession', 'true');
        }
    }, [currentConversationId, forceHost]);

    // 1. Data Loading
    const {
        data: conversationData,
        isLoading: isConversationLoading,
        error: conversationError
    } = useConversation(currentConversationId);

    // 4. Session Interface (Start/Stop) - Moved up for dependencies
    const { handleStartSession } = useSessionInterface(currentConversationId);

    // 5. Auto Start Logic
    const {
        isAutoStarting,
        autoStartCountdown,
        triggerAutoStart,
        cancelAutoStart,
        cleanup: cleanupAutoStart
    } = useAutoStartSession({
        onStartSession: handleStartSession,
        isSessionStarted: Boolean(conversationData?.session_started),
        maxParticipants: conversationData?.participants || 10
    });

    // Cleanup auto-start on unmount
    useEffect(() => {
        return () => {
            cleanupAutoStart();
        };
    }, [cleanupAutoStart]);

    // 2. Participant & Session State Management (Single Source of Truth)
    const {
        isConnected,
        error: participantError,
        participants,
        currentCount,
        maxCount,
        isSessionStarted: isManagerSessionStarted,
        refresh
    } = useHostParticipantManager({
        conversationId: currentConversationId,
        enabled: !!currentConversationId,
        onSessionFull: () => {
            console.log("Session full detected in host logic");
            triggerAutoStart(currentCount);
        }
    });

    // 3. Messages Management
    const [sessionMessages, setSessionMessages] = useState<Message[]>([]);
    const {
        isSessionPaused,
        toggleSessionState,
        handleHostMessage,
        handleSendHostMessage,
        responseCount,
        isWaitingForResponses,
        totalParticipants,
        triggerFacilitatorResponse,
        isProcessingAutoStart
    } = useHostMessages({
        conversationId: currentConversationId,
        participants,
        messages: sessionMessages,
        setMessages: setSessionMessages,
        conversationData
    });

    // 5. Loading State Management (Preserving "Safe Mode" logic)
    const [isLoading, setIsLoading] = useState(true);
    const [hostViewReady, setHostViewReady] = useState(false);
    const mountedRef = useRef(false);

    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    useEffect(() => {
        // If we have data and connection, we are ready
        if (conversationData && isConnected) {
            setIsLoading(false);
            setHostViewReady(true);
        }

        // Fallback: Force ready after timeout (Safe Mode)
        const timeout = setTimeout(() => {
            if (mountedRef.current && isLoading) {
                console.log("Forcing host view ready after timeout (Safe Mode)");
                setIsLoading(false);
                setHostViewReady(true);
                if (!conversationData) {
                    toast({
                        title: "Host Session Ready",
                        description: "Host interface loaded in safe mode."
                    });
                }
            }
        }, 2500);

        return () => clearTimeout(timeout);
    }, [conversationData, isConnected, isLoading, toast]);

    // 6. Validation & Redirects
    useEffect(() => {
        if (!isLoading && !currentConversationId && !locationState?.newConversationId) {
            // Only redirect if we are truly lost
            if (!window.location.pathname.includes('/host')) {
                navigate('/');
            }
        }
    }, [isLoading, currentConversationId, locationState, navigate]);

    // 7. Session Start Handler
    const handleSessionStarted = useCallback(async () => {
        try {
            await handleStartSession();
            // The manager will pick up the change via realtime
        } catch (error) {
            console.error("Error starting session:", error);
            toast({
                title: "Error",
                description: "Failed to start session",
                variant: "destructive"
            });
        }
    }, [handleStartSession, toast]);

    return {
        // State
        isLoading,
        hostViewReady,
        conversationData,
        currentConversationId,

        // Participants
        participants,
        participantCount: participants.length,
        isLoadingParticipants: !isConnected,

        // Session Status
        isSessionStarted: isManagerSessionStarted || conversationData?.session_started,
        isAutoStarting: isAutoStarting || isProcessingAutoStart,
        autoStartCountdown,
        cancelAutoStart,

        // Messages
        sessionMessages,
        isSessionPaused,
        responseCount,
        isWaitingForResponses,

        // Actions
        toggleSessionState,
        handleSendHostMessage,
        triggerFacilitatorResponse,
        handleSessionStarted,
        refresh
    };
}
