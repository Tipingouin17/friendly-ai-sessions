/**
 * use Session Host Logic
 *
 * Hook for the AIfacilitator application.
 */

import { createLogger } from '@/utils/debugLogger';

const log = createLogger('useSessionHostLogic', 'session');

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
import { useSessionTimer } from "@/hooks/useSessionTimer";
import { useFacilitatorToolbox } from "@/hooks/useFacilitatorToolbox";
import { useFacilitationModeOrchestrator } from "@/hooks/useFacilitationModeOrchestrator";
import { useSessionStatus } from "@/hooks/useSessionStatus";
import type { FacilitatorModeAssignment } from "@/services/modeOrchestratorService";

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
        error: conversationError,
        refetch: refetchConversation
    } = useConversation(currentConversationId);
    const toolbox = useFacilitatorToolbox(conversationData);
    const modeOrchestrator = useFacilitationModeOrchestrator(conversationData, {
        conversationId: currentConversationId,
    });

    // Wire the session-status realtime subscription so that any UPDATE to the
    // conversations row (including current_participants increments when a
    // participant joins) immediately triggers a refetch of conversationData.
    // Without this the host page sees stale current_participants = 0 and the
    // Start Session button stays disabled even when participants are waiting.
    useSessionStatus(currentConversationId, refetchConversation);

    // 4. Session Interface (Start/Stop) - Moved up for dependencies
    const { handleStartSession, isSessionStarted: isInterfaceSessionStarted } = useSessionInterface(currentConversationId, conversationData);
    const [hostSessionStartedOverride, setHostSessionStartedOverride] = useState(false);
    const [sessionMessages, setSessionMessages] = useState<Message[]>([]);
    const hasPersistedStartMarker = Boolean(
        conversationData?.session_started || (conversationData as any)?.session_started_at
    );
    const handleSessionStarted = useCallback(async () => {
        try {
            await handleStartSession();
            // Only switch the host into live management after the backend start
            // mutation has succeeded and the persisted start marker has been
            // confirmed. Participant views use the same persisted marker.
            setHostSessionStartedOverride(true);
            void refetchConversation();
        } catch (error) {
            console.error("Error starting session:", error);
            toast({
                title: "Error",
                description: "Failed to start session",
                variant: "destructive"
            });
            setHostSessionStartedOverride(false);
            throw error;
        }
    }, [handleStartSession, refetchConversation, toast]);

    const {
        isAutoStarting,
        autoStartCountdown,
        triggerAutoStart,
        cancelAutoStart,
        cleanup: cleanupAutoStart
    } = useAutoStartSession({
        onStartSession: handleSessionStarted,
        // `isManagerSessionStarted` is produced by useHostParticipantManager below, so
        // it cannot be referenced here without causing a render-time temporal-dead-zone
        // ReferenceError on the host route. The full effective live-state is combined
        // after all hooks have initialized.
        isSessionStarted: Boolean(hostSessionStartedOverride || hasPersistedStartMarker || isInterfaceSessionStarted),
        maxParticipants: Math.max(conversationData?.participants || 0, 0),
    });

    useEffect(() => cleanupAutoStart, [cleanupAutoStart]);

    useEffect(() => {
        setHostSessionStartedOverride(false);
    }, [currentConversationId]);

    // 2. Participant & Session State Management (Single Source of Truth)
    const {
        isConnected,
        isDataLoaded,
        error: participantError,
        participants,
        currentCount,
        maxCount,
        isSessionStarted: isManagerSessionStarted,
        refresh
    } = useHostParticipantManager({
        conversationId: currentConversationId,
        enabled: !!currentConversationId,
        onSessionStarted: () => {
            // Keep the conversation query fresh for header/status labels and any
            // consumers that still read persisted start fields directly.
            void refetchConversation();
        },
        // Full capacity enables a ready start state; it must not start the
        // session until the host explicitly presses Start Session.
        onSessionFull: () => undefined
    });

    // 3. Messages Management
    const {
        isSessionPaused,
        toggleSessionState,
        handleHostMessage,
        handleSendHostMessage,
        responseCount,
        isWaitingForResponses,
        totalParticipants,
        triggerFacilitatorResponse,
        isGeneratingResponse,
        isProcessingAutoStart
    } = useHostMessages({
        conversationId: currentConversationId,
        participants,
        messages: sessionMessages,
        setMessages: setSessionMessages,
        conversationData
    });

    // Treat the session as live only after the shared persisted start signal has
    // been confirmed by the backend-backed hooks, or after an explicit host start
    // has completed successfully. Assistant messages alone must not move the host
    // into live mode because participants rely on the same persisted start signal.
    const effectiveIsSessionStarted = Boolean(
        hostSessionStartedOverride ||
        hasPersistedStartMarker ||
        isInterfaceSessionStarted ||
        isManagerSessionStarted
    );

    // Capacity is host-inclusive in `participants`, while current_participants
    // stores non-host attendee rows. Product-facing room metrics therefore use
    // the current count directly and normalize capacity once.
    const attendeeCountFromConversation = Math.max(currentCount, 0);
    const attendeeCapacityFromManager = Math.max(maxCount, 0);
    const attendeeCapacityFromConversation = (conversationData?.participants || 0) > 0
        ? Math.max((conversationData?.participants || 0) - 1, 0)
        : 0;
    const waitingRoomParticipantCount = Math.max(
        attendeeCountFromConversation,
        (participants || []).filter((participant) => !participant.isHost && !participant.isAdmin).length
    );
    const waitingRoomCapacity = Math.max(
        attendeeCapacityFromManager,
        attendeeCapacityFromConversation,
        waitingRoomParticipantCount
    );
    const isWaitingRoomFull = Boolean(
        !effectiveIsSessionStarted &&
        waitingRoomCapacity > 0 &&
        waitingRoomParticipantCount >= waitingRoomCapacity
    );

    useEffect(() => {
        if ((hasPersistedStartMarker || isInterfaceSessionStarted || isManagerSessionStarted) && !hostSessionStartedOverride) {
            setHostSessionStartedOverride(true);
        }
    }, [hasPersistedStartMarker, hostSessionStartedOverride, isInterfaceSessionStarted, isManagerSessionStarted]);

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

    // 7. Timer & AI Wrap-up
    const timer = useSessionTimer(conversationData ?? null, true);
    const wrapUpFiredRef = useRef<{ tenMin: boolean; twoMin: boolean }>({
        tenMin: false,
        twoMin: false,
    });

    useEffect(() => {
        const { timeRemaining, isExpired } = timer;
        if (timeRemaining === null) return;
        if (!effectiveIsSessionStarted || isExpired) return;

        // 10-minute warning
        if (timeRemaining <= 600 && !wrapUpFiredRef.current.tenMin) {
            wrapUpFiredRef.current.tenMin = true;
            triggerFacilitatorResponse(
                "[SYSTEM] The session will end in 10 minutes. Please start wrapping up the discussion, summarise key insights so far, and let participants know time is running short."
            );
        }

        // 2-minute warning
        if (timeRemaining <= 120 && !wrapUpFiredRef.current.twoMin) {
            wrapUpFiredRef.current.twoMin = true;
            triggerFacilitatorResponse(
                "[SYSTEM] The session ends in 2 minutes. Please deliver a concise final summary and thank the participants."
            );
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Intentional session lifecycle boundary: dependencies are mediated by refs/one-shot guards so realtime subscriptions, timers, and recovery flows are not replayed by changing callback identities.
    }, [timer.timeRemaining]);

    const handleStartMode = useCallback((mode: FacilitatorModeAssignment, prompt?: string) => {
        return modeOrchestrator.startMode({
            modeId: mode.id,
            prompt,
            policy: mode.effective_policy,
        });
    }, [modeOrchestrator]);

    return {
        // State
        isLoading,
        hostViewReady,
        conversationData,
        currentConversationId,

        // Participants
        participants,
        participantCount: participants.length,
        isLoadingParticipants: !isDataLoaded,

        // Session Status
        isSessionStarted: effectiveIsSessionStarted,
        isAutoStarting: isAutoStarting || isProcessingAutoStart,
        autoStartCountdown,
        cancelAutoStart,
        isWaitingRoomFull,
        waitingRoomParticipantCount,
        waitingRoomCapacity,

        // Messages
        sessionMessages,
        isSessionPaused,
        responseCount,
        isWaitingForResponses,
        isGeneratingResponse,

        // Actions
        toggleSessionState,
        handleSendHostMessage,
        triggerFacilitatorResponse: (hostInstruction?: string) => {
            const finalInstruction = [
                toolbox.toolboxInstruction,
                modeOrchestrator.modeInstruction,
                hostInstruction,
            ].filter(Boolean).join("\n\n");
            return triggerFacilitatorResponse(finalInstruction || undefined);
        },
        enabledTools: toolbox.enabledTools,
        isLoadingToolbox: toolbox.isLoadingToolbox,
        toolboxError: toolbox.toolboxError,
        enabledModes: modeOrchestrator.enabledModes,
        activeMode: modeOrchestrator.activeMode,
        recentModeEvents: modeOrchestrator.recentModeEvents,
        isLoadingModes: modeOrchestrator.isLoadingModes,
        modeError: modeOrchestrator.modeError,
        startMode: handleStartMode,
        approveMode: modeOrchestrator.approveMode,
        endMode: modeOrchestrator.endMode,
        rejectMode: modeOrchestrator.rejectMode,
        handleSessionStarted,
        refresh,

        // Timer
        timer,
    };
}
