/**
 * Input Footer
 *
 * Session component for the AIfacilitator application.
 * Includes participant engagement controls (skip, pause, message host).
 */

import { createLogger } from '@/utils/debugLogger';

const log = createLogger('InputFooter', 'session');

import React from 'react';
import ChatInput from "@/components/chat/ChatInput";
import { Message, ParticipantInfo } from "@/types/chat";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Lock, MessageSquare, Star, Timer, Users, Wrench } from "lucide-react";
import type { FacilitatorToolAssignment } from "@/types/facilitator";
import type { FacilitatorModeAssignment, ModeInput, ModeParticipantState, SessionActiveMode, SessionModeEvent } from "@/services/modeOrchestratorService";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import ParticipantEngagementControls from './ParticipantEngagementControls';
import { useParticipantEngagement } from '@/hooks/useParticipantEngagement';

interface InputFooterProps {
  participantCount: number;
  currentParticipant: number;
  participantNames: { [key: number]: string };
  participants: ParticipantInfo[];
  inputMessage: string;
  setInputMessage: (message: string) => void;
  onSendMessage: () => void;
  isRecording: boolean;
  setIsRecording: (isRecording: boolean) => void;
  currentUserParticipantId?: number | null;
  isAnonymous: boolean;
  toggleAnonymous: () => void;
  hasAnswered: boolean;
  totalResponses: number;
  viewMode: "participant" | "admin";
  messages?: Message[];
  showResponseStats?: boolean;
  conversationId?: number | null;
  onParticipantStatusChange?: (participantId: number, status: 'active' | 'paused' | 'skipped') => void;
  enabledTools?: FacilitatorToolAssignment[];
  isLoadingToolbox?: boolean;
  enabledModes?: FacilitatorModeAssignment[];
  activeMode?: SessionActiveMode | null;
  participantModeState?: ModeParticipantState | null;
  recentModeEvents?: SessionModeEvent[];
  isLoadingModes?: boolean;
  modeError?: string | null;
  submitModeInput?: (params: {
    inputType: string;
    content: Record<string, unknown>;
    visibility?: ModeInput["visibility"];
  }) => Promise<unknown>;
}

const InputFooter = ({
  participantCount,
  currentParticipant,
  participantNames,
  participants,
  inputMessage,
  setInputMessage,
  onSendMessage,
  isRecording,
  setIsRecording,
  currentUserParticipantId,
  isAnonymous,
  toggleAnonymous,
  hasAnswered,
  totalResponses,
  viewMode,
  messages = [],
  showResponseStats = false,
  conversationId = null,
  onParticipantStatusChange,
  enabledTools = [],
  isLoadingToolbox = false,
  enabledModes = [],
  activeMode = null,
  participantModeState = null,
  recentModeEvents = [],
  isLoadingModes = false,
  modeError = null,
  submitModeInput,
}: InputFooterProps) => {
  const isMobile = useIsMobile();
  const { maxQuestionsPerSession } = usePlanLimits();
  const [modeDraft, setModeDraft] = React.useState('');
  const [selectedModeOption, setSelectedModeOption] = React.useState('');
  const [selectedModeRating, setSelectedModeRating] = React.useState<number | null>(null);
  const [isSubmittingModeInput, setIsSubmittingModeInput] = React.useState(false);
  const [modeInputSubmitted, setModeInputSubmitted] = React.useState(false);

  // Find current participant info
  const participantInfo = participants.find(p => p.id === currentParticipant);
  const participantName = participantInfo?.name ||
    participantNames[currentParticipant] ||
    `Participant ${currentParticipant}`;

  // Engagement controls
  const engagement = useParticipantEngagement({
    conversationId,
    participantId: currentUserParticipantId ?? currentParticipant,
    participantName,
  });

  // Notify parent when status changes (so response counting can exclude paused/skipped)
  const effectiveParticipantId = currentUserParticipantId ?? currentParticipant;
  React.useEffect(() => {
    onParticipantStatusChange?.(effectiveParticipantId, engagement.status);
  }, [engagement.status, effectiveParticipantId, onParticipantStatusChange]);

  // Reset skip when a new facilitator message arrives
  const lastAssistantMessageId = React.useMemo(() => {
    const assistantMessages = messages.filter(m => m.sender === 'assistant');
    return assistantMessages.length > 0 ? assistantMessages[assistantMessages.length - 1].id : null;
  }, [messages]);
  React.useEffect(() => {
    engagement.resetSkip();
  }, [lastAssistantMessageId, engagement.resetSkip]);

  // Safely determine if this is a new session with just a welcome message
  const isNewSession = Array.isArray(messages) && messages.length <= 1 &&
    messages.every(msg => msg.sender === 'assistant' || msg.id === 'welcome');

  // Check if the most recent message is from the facilitator
  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  const shouldAllowAnswer = (lastMessage?.sender === 'assistant' || isNewSession || !hasAnswered)
    && !engagement.isPaused
    && !engagement.isSkipped;

  // Count how many questions this participant has sent
  const participantKey = String(effectiveParticipantId);
  const userMessageCount = Array.isArray(messages)
    ? messages.filter(m => m.sender === 'user' && m.participant === participantKey).length
    : 0;
  const hasReachedQuestionLimit = maxQuestionsPerSession !== Infinity && userMessageCount >= maxQuestionsPerSession;

  const activeModeDefinition = activeMode?.facilitation_mode;
  const activeModeKey = activeModeDefinition?.mode_key ?? null;
  const activeModeOptions = activeMode?.options ?? {};
  const configuredChoices = React.useMemo(() => {
    const options = activeModeOptions.choices ?? activeModeOptions.options;
    return Array.isArray(options) ? options.map(String) : [];
  }, [activeModeOptions]);
  const activeModeCanSubmit = Boolean(submitModeInput)
    && Boolean(activeMode)
    && (participantModeState?.can_submit ?? true)
    && !modeInputSubmitted;

  React.useEffect(() => {
    setModeDraft('');
    setSelectedModeOption('');
    setSelectedModeRating(null);
    setModeInputSubmitted(false);
  }, [activeMode?.id]);

  const submitStructuredModeInput = async (
    inputType: string,
    content: Record<string, unknown>,
    visibility: ModeInput["visibility"] = "private_until_synthesis"
  ) => {
    if (!submitModeInput || !activeMode || modeInputSubmitted) return;
    setIsSubmittingModeInput(true);
    try {
      await submitModeInput({ inputType, content, visibility });
      setModeInputSubmitted(true);
    } finally {
      setIsSubmittingModeInput(false);
    }
  };

  const submitTextModeInput = async () => {
    const trimmed = modeDraft.trim();
    if (!trimmed) return;
    await submitStructuredModeInput("text", { text: trimmed }, "private_until_synthesis");
  };

  const submitChoiceModeInput = async (choice: string) => {
    setSelectedModeOption(choice);
    await submitStructuredModeInput("choice", { choice }, "anonymous_aggregate");
  };

  const submitRatingModeInput = async (rating: number) => {
    setSelectedModeRating(rating);
    await submitStructuredModeInput("rating", { rating }, "anonymous_aggregate");
  };

  // Enhanced participant detection logic
  const urlParams = new URLSearchParams(window.location.search);
  const hasParticipantParams = urlParams.has('participantId') || urlParams.has('name');
  const isParticipantContext = hasParticipantParams || viewMode === "participant";

  // Don't show input for pure admin view (without participant context)
  if (viewMode === "admin" && !isParticipantContext) {
    return null;
  }

  return (
    <>
      {showResponseStats && (
        <div className="px-2 py-1 border-t border-gray-100 bg-white">
          <Badge variant="outline" className="bg-gray-50 text-xs px-1.5 py-0.5">
            <Users className="w-3 h-3 mr-1" />
            <span>{totalResponses} of {participantCount} answered</span>
          </Badge>
        </div>
      )}

      <div className="w-full border-t border-gray-100 bg-white/90 backdrop-blur-sm" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {/* Question limit reached */}
        {isParticipantContext && hasReachedQuestionLimit ? (
          <div className="p-3 sm:p-4 flex flex-col items-center justify-center">
            <div className="mb-2 flex items-center justify-center gap-2 bg-amber-50 px-3 py-2 rounded-md text-amber-700 border border-amber-200 w-full text-sm">
              <Lock className="h-4 w-4" />
              <span className="font-medium">
                Question limit reached ({maxQuestionsPerSession} per session).{" "}
                <a href="/pricing" className="underline hover:text-amber-900">Upgrade your plan</a> for more.
              </span>
            </div>
          </div>
        ) : isParticipantContext ? (
          <>
            {/* Engagement controls: skip / pause / message host */}
            <ParticipantEngagementControls
              status={engagement.status}
              onSkip={engagement.skipQuestion}
              onTogglePause={engagement.togglePause}
              onSendHostMessage={engagement.sendMessageToHost}
              isSendingHostMessage={engagement.isSendingHostMessage}
              hostMessageSent={engagement.hostMessageSent}
              hasAnswered={hasAnswered}
              isMobile={isMobile}
            />

            {isParticipantContext && (enabledTools.length > 0 || isLoadingToolbox || enabledModes.length > 0 || isLoadingModes || activeMode || modeError) && !engagement.isPaused && !engagement.isSkipped && (
              <div className="space-y-2 px-3 pb-2">
                {(enabledTools.length > 0 || isLoadingToolbox) && (
                  <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 px-3 py-2 text-xs text-indigo-800">
                    <div className="flex items-center gap-1.5 font-semibold">
                      <Wrench className="h-3.5 w-3.5" />
                      Facilitator toolbox
                    </div>
                    <p className="mt-1 text-indigo-700/80">
                      {isLoadingToolbox
                        ? 'Loading the facilitator\'s available tools…'
                        : `This facilitator can choose from ${enabledTools.length} assigned tool${enabledTools.length === 1 ? '' : 's'} during the discussion.`}
                    </p>
                    {!isLoadingToolbox && enabledTools.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {enabledTools.slice(0, 4).map((tool) => (
                          <span key={tool.access_id || tool.id} className="rounded-full border border-indigo-200 bg-white px-2 py-0.5 font-medium text-indigo-700">
                            {tool.effective_config?.composerLabel || tool.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {(enabledModes.length > 0 || isLoadingModes || modeError) && !activeMode && (
                  <div className="rounded-xl border border-sky-100 bg-sky-50/70 px-3 py-2 text-xs text-sky-800">
                    <div className="flex items-center gap-1.5 font-semibold">
                      <MessageSquare className="h-3.5 w-3.5" />
                      Facilitation modes
                    </div>
                    <p className="mt-1 text-sky-700/80">
                      {modeError
                        ? modeError
                        : isLoadingModes
                          ? 'Loading facilitation modes…'
                          : `This facilitator can activate ${enabledModes.length} structured mode${enabledModes.length === 1 ? '' : 's'} when the group needs a different interaction pattern.`}
                    </p>
                  </div>
                )}

                {activeMode && activeModeDefinition && (
                  <div className="rounded-xl border border-purple-200 bg-purple-50 px-3 py-3 text-sm text-purple-900">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 font-semibold">
                        <Timer className="h-4 w-4" />
                        {activeModeDefinition.display_name}
                      </div>
                      <Badge variant="outline" className="border-purple-200 bg-white text-purple-700">
                        {activeMode.status.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-purple-700/90">
                      {activeMode.prompt || activeModeDefinition.composer_copy || activeModeDefinition.purpose}
                    </p>
                    {recentModeEvents.length > 0 && (
                      <div className="mt-2 rounded-lg border border-purple-100 bg-white/70 px-3 py-2 text-[11px] text-purple-700">
                        Latest mode event: {recentModeEvents[0]?.event_type?.replace(/_/g, ' ') || 'updated'}
                        {recentModeEvents[0]?.created_at ? ` · ${new Date(recentModeEvents[0].created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                      </div>
                    )}
                    {modeInputSubmitted ? (
                      <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                        <CheckCircle2 className="h-4 w-4" />
                        Your mode response was submitted.
                      </div>
                    ) : activeModeKey === 'voting_rating' ? (
                      <div className="mt-3 space-y-3">
                        {configuredChoices.length > 0 && (
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {configuredChoices.map((choice) => (
                              <button
                                key={choice}
                                type="button"
                                disabled={!activeModeCanSubmit || isSubmittingModeInput}
                                onClick={() => submitChoiceModeInput(choice)}
                                className={`rounded-lg border px-3 py-2 text-left text-xs font-medium transition ${selectedModeOption === choice ? 'border-purple-400 bg-white text-purple-900' : 'border-purple-200 bg-white/80 text-purple-800 hover:bg-white'} disabled:cursor-not-allowed disabled:opacity-60`}
                              >
                                {choice}
                              </button>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          {[1, 2, 3, 4, 5].map((rating) => (
                            <button
                              key={rating}
                              type="button"
                              disabled={!activeModeCanSubmit || isSubmittingModeInput}
                              onClick={() => submitRatingModeInput(rating)}
                              className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold transition ${selectedModeRating === rating ? 'border-amber-400 bg-amber-100 text-amber-800' : 'border-purple-200 bg-white text-purple-700 hover:bg-purple-100'} disabled:cursor-not-allowed disabled:opacity-60`}
                            >
                              <Star className="h-3.5 w-3.5" />
                              <span className="sr-only">Rate {rating}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : activeModeKey === 'turn_taking' ? (
                      <div className="mt-3 rounded-lg border border-purple-200 bg-white/80 px-3 py-2 text-xs text-purple-800">
                        {participantModeState?.is_current_speaker
                          ? 'It is your turn to speak. Use the regular response box below when you are ready.'
                          : participantModeState?.is_next
                            ? 'You are next in the speaking queue.'
                            : 'Please wait while the facilitator manages the speaking order.'}
                      </div>
                    ) : activeModeKey === 'open_discussion' ? (
                      <div className="mt-3 rounded-lg border border-purple-200 bg-white/80 px-3 py-2 text-xs text-purple-800">
                        Open discussion is active. Use the response box below; the facilitator will manage synthesis and follow-ups.
                      </div>
                    ) : (
                      <div className="mt-3 space-y-2">
                        <textarea
                          value={modeDraft}
                          onChange={(event) => setModeDraft(event.target.value)}
                          disabled={!activeModeCanSubmit || isSubmittingModeInput}
                          placeholder={activeModeDefinition.composer_copy || 'Write your private response for this facilitation mode…'}
                          className="min-h-[84px] w-full rounded-lg border border-purple-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none ring-0 transition focus:border-purple-400 focus:ring-2 focus:ring-purple-100 disabled:cursor-not-allowed disabled:opacity-60"
                        />
                        <button
                          type="button"
                          disabled={!activeModeCanSubmit || isSubmittingModeInput || modeDraft.trim().length === 0}
                          onClick={submitTextModeInput}
                          className="rounded-lg bg-purple-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-purple-300"
                        >
                          Submit mode response
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Chat input — hidden when paused or skipped */}
            {!engagement.isPaused && !engagement.isSkipped && (
              <ChatInput
                inputMessage={inputMessage}
                setInputMessage={setInputMessage}
                onSendMessage={onSendMessage}
                isRecording={isRecording}
                setIsRecording={setIsRecording}
                placeholder="Type your response…"
                disabled={!shouldAllowAnswer}
                isMobile={isMobile}
              />
            )}
          </>
        ) : (
          <div className="p-3 sm:p-4 flex flex-col items-center justify-center">
            <div className="mb-2 flex items-center justify-center gap-2 bg-green-50 px-3 py-2 rounded-md text-green-700 border border-green-200 w-full text-sm">
              <span className="font-medium">Your answer has been submitted</span>
            </div>
            <p className="text-xs text-gray-500">
              Waiting for other participants to respond…
            </p>
          </div>
        )}
      </div>
    </>
  );
};

export default InputFooter;
