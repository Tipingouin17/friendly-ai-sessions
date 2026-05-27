/**
 * Simplified Host Messaging View — Redesigned
 *
 * Conductor-first layout: the host observes live session intelligence
 * (engagement, response rate, topic flow) and steers via the AI Facilitator
 * control panel. The chat transcript is available as a secondary tab.
 */
import React, { useState } from 'react';
import { useInactivityTimer } from '@/hooks/useInactivityTimer';
import InactivityAlert from '@/components/session/host/InactivityAlert';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Message, ParticipantInfo } from '@/types/chat';
import type { ConversationWithSession } from '@/types/database';
import type { FacilitatorToolAssignment } from '@/types/facilitator';
import type { FacilitatorVoiceGender } from '@/utils/facilitatorVoiceGender';
import type { FacilitatorModeAssignment, SessionActiveMode, SessionModeEvent } from '@/services/modeOrchestratorService';
import PreSessionHostView from '@/components/session/host/PreSessionHostView';
import {
  MessageSquare, Wand2, SendHorizonal,
  ChevronDown, ChevronUp,
  Activity, Clock
} from 'lucide-react';

interface SimplifiedHostMessagingViewProps {
  messages: Message[];
  participantColors: { [key: string]: string };
  currentParticipantCount: number;
  conversationData: ConversationWithSession | null;
  isWaitingForResponses?: boolean;
  responseCount?: number;
  totalParticipants?: number;
  onTriggerFacilitatorResponse?: (hostInstruction?: string) => void;
  isSessionStarted?: boolean;
  onSessionStarted?: () => void;
  participants?: ParticipantInfo[];
  conversationId?: number | null;
  isAutoStarting?: boolean;
  autoStartCountdown?: number;
  onCancelAutoStart?: () => void;
  isSessionEnded?: boolean;
  isSessionPaused?: boolean;
  enabledTools?: FacilitatorToolAssignment[];
  isLoadingToolbox?: boolean;
  toolboxError?: string | null;
  enabledModes?: FacilitatorModeAssignment[];
  activeMode?: SessionActiveMode | null;
  recentModeEvents?: SessionModeEvent[];
  isLoadingModes?: boolean;
  modeError?: string | null;
  onStartMode?: (mode: FacilitatorModeAssignment, prompt?: string) => Promise<void>;
  onApproveMode?: (reason?: string) => Promise<void>;
  onEndMode?: (reason?: string) => Promise<void>;
  onRejectMode?: (reason?: string) => Promise<void>;
  facilitatorVoiceGender?: FacilitatorVoiceGender | null;
}

const SimplifiedHostMessagingView: React.FC<SimplifiedHostMessagingViewProps> = ({
  messages,
  participantColors,
  currentParticipantCount,
  conversationData,
  isWaitingForResponses = false,
  responseCount = 0,
  totalParticipants = 0,
  onTriggerFacilitatorResponse,
  isSessionStarted = false,
  onSessionStarted,
  participants = [],
  conversationId,
  isAutoStarting = false,
  autoStartCountdown = 0,
  onCancelAutoStart,
  isSessionEnded = false,
  isSessionPaused = false,
  activeMode = null,
}) => {
  const [activeTab, setActiveTab] = useState<'controls' | 'transcript'>('controls');
  const [hostInstruction, setHostInstruction] = useState('');
  const [isInstructionExpanded, setIsInstructionExpanded] = useState(false);

  const [isSending, setIsSending] = useState(false);
  const [inactivityDismissed, setInactivityDismissed] = useState(false);

  // Inactivity timer — purely indicative, never auto-triggers anything
  const { elapsedSeconds, isInactive, pendingCount, resetTimer } = useInactivityTimer({
    messages,
    responseCount,
    totalParticipants,
    isWaitingForResponses,
    isSessionEnded,
    thresholdSeconds: 180, // 3 minutes — will be a configurable admin setting later
  });

  // Reset dismissed state whenever a new inactivity period starts
  const handleDismissInactivity = () => {
    setInactivityDismissed(true);
  };
  // Auto-un-dismiss when the timer resets (new question or all responded)
  React.useEffect(() => {
    if (!isInactive) setInactivityDismissed(false);
  }, [isInactive]);

  // Show pre-session view if session hasn't started
  if (!isSessionStarted) {
    return (
      <PreSessionHostView
        conversationData={conversationData}
        conversationId={conversationId}
        participantCount={currentParticipantCount}
        onSessionStarted={onSessionStarted || (() => { /* no-op */ })}
        isAutoStarting={isAutoStarting}
        autoStartCountdown={autoStartCountdown}
        onCancelAutoStart={onCancelAutoStart}
      />
    );
  }

  const handleSendWithInstruction = async () => {
    if (!onTriggerFacilitatorResponse) return;
    setIsSending(true);
    try {
      await onTriggerFacilitatorResponse(hostInstruction.trim() || undefined);
      setHostInstruction('');
      setIsInstructionExpanded(false);
    } finally {
      setIsSending(false);
    }
  };

  const handleContinueNormal = async () => {
    if (!onTriggerFacilitatorResponse) return;
    setIsSending(true);
    try {
      await onTriggerFacilitatorResponse();
    } finally {
      setIsSending(false);
    }
  };

  const activeModeDefinition = activeMode?.facilitation_mode;

  const quickInstructions = [
    {
      label: 'Wrap up',
      instruction: 'The host has decided to end the session now. Do not ask another question. Warmly thank participants, synthesize the 2-3 most important insights, share a brief closing thought, and formally close the session.'
    },
    {
      label: 'Final round',
      instruction: 'This is the last question of the session. Ask one concise final question that invites participants to share their most important takeaway or commitment.'
    },
    {
      label: 'Go deeper',
      instruction: 'Go deeper on the current topic. Ask a more specific, probing follow-up question that challenges participants to think beyond their first answers.'
    },
    {
      label: 'Change topic',
      instruction: 'Transition to a new aspect of the workshop topic. Briefly acknowledge what was shared so far, then pivot naturally.'
    },
    {
      label: 'Make practical',
      instruction: 'Focus on practical, actionable examples. Ask participants to share concrete next steps they could take within the next week.'
    },
    {
      label: 'Open floor',
      instruction: 'Open the floor for participants to raise any topic, question, or concern they feel has not been addressed yet. Invite them to share freely.'
    },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-50">

      {/* ── Tab Bar ── */}
      <div className="flex items-center gap-1 px-4 pt-3 pb-0 bg-white border-b border-slate-200">
        <button
              onClick={() => setActiveTab('controls')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
            activeTab === 'controls'
              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/60'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Activity className="h-3.5 w-3.5" />
          Controls
        </button>
        <button
              onClick={() => setActiveTab('transcript')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
            activeTab === 'transcript'
              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/60'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          Transcript
          {messages.length > 0 && (
            <span className="ml-1 inline-flex items-center justify-center min-w-[1.1rem] h-4 px-1 rounded-full text-[10px] font-semibold bg-slate-200 text-slate-600">
              {messages.length}
            </span>
          )}
        </button>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'controls' ? (
          <ScrollArea className="h-full">
            <div className="p-5 space-y-4">

              {/* Host Command Center */}
              <div className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-white via-indigo-50/50 to-violet-50/60 p-4 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">Next facilitation move</p>
                    <h2 className="mt-1 font-display text-xl font-bold tracking-tight text-slate-950">Guide the room from one clear command surface.</h2>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span className="session-chip border-indigo-200 bg-white/80 text-indigo-700">{activeModeDefinition?.display_name || 'Open Discussion'}</span>
                      {isWaitingForResponses && <span className="session-chip border-amber-200 bg-white/80 text-amber-700">Collecting responses</span>}
                      {isSessionPaused && <span className="session-chip border-amber-200 bg-white/80 text-amber-700">Paused</span>}
                      {isSessionEnded && <span className="session-chip border-slate-200 bg-white/80 text-slate-700">Ended</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Response Collection Progress */}
              {isWaitingForResponses && (
                <div className="session-soft-panel rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-amber-500" />
                      <span className="text-sm font-semibold text-slate-900">Collecting Responses</span>
                    </div>
                    <span className="text-xs font-medium text-slate-500">
                      {responseCount} of {totalParticipants}
                    </span>
                  </div>
                  <div className="session-progress-track w-full rounded-full h-2 mb-3 overflow-hidden">
                    <div
                      className="session-progress-fill h-2 rounded-full transition-all duration-500"
                      style={{ width: totalParticipants > 0 ? `${(responseCount / totalParticipants) * 100}%` : '0%' }}
                    />
                  </div>
                  {onTriggerFacilitatorResponse && (
                    <Button
                      onClick={handleContinueNormal}
                      variant="outline"
                      size="sm"
                      disabled={isSending}
                      className="h-7 border-slate-200 text-xs text-slate-700 hover:bg-slate-100"
                    >
                      {isSending ? (
                        <span className="flex items-center gap-1.5">
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-indigo-200" />
                          Generating…
                        </span>
                      ) : 'Continue without waiting'}
                    </Button>
                  )}
                </div>
              )}

              {/* Inactivity alert — shown after 3 min of no new response */}
              {isInactive && !inactivityDismissed && (
                <InactivityAlert
                  elapsedSeconds={elapsedSeconds}
                  pendingCount={pendingCount}
                  totalParticipants={totalParticipants}
                  onDismiss={handleDismissInactivity}
                />
              )}

              {/* Steer the AI Facilitator */}
              <div className={`session-soft-panel rounded-2xl overflow-hidden transition-all ${
                isInstructionExpanded
                  ? 'border-indigo-200 bg-indigo-50'
                  : ''
              }`}>
                <button
                  className="w-full flex items-center justify-between px-4 py-3.5 text-left"
                  onClick={() => setIsInstructionExpanded(!isInstructionExpanded)}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`p-1.5 rounded-lg ${isInstructionExpanded ? 'bg-indigo-600' : 'bg-slate-100'}`}>
                      <Wand2 className={`h-3.5 w-3.5 ${isInstructionExpanded ? 'text-white' : 'text-slate-600'}`} />
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${isInstructionExpanded ? 'text-indigo-800' : 'text-slate-900'}`}>
                        Private facilitator instruction
                      </p>
                      <p className="text-xs text-slate-500">Only affects the next AI turn.</p>
                    </div>
                  </div>
                  {isInstructionExpanded
                    ? <ChevronUp className="h-4 w-4 text-indigo-200" />
                    : <ChevronDown className="h-4 w-4 text-slate-500" />
                  }
                </button>

                {isInstructionExpanded && (
                  <div className="space-y-3 border-t border-slate-200 px-4 pb-4">
                    <div className="flex flex-wrap gap-2 pt-3">
                      {quickInstructions.map((qi) => (
                        <button
                          key={qi.label}
                          onClick={() => setHostInstruction(qi.instruction)}
                          className={`session-control-button inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                            hostInstruction === qi.instruction
                              ? 'border-indigo-500 bg-indigo-600 text-white'
                              : 'border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50'
                          }`}
                        >
                          {qi.label}
                        </button>
                      ))}
                    </div>

                    <Textarea
                      value={hostInstruction}
                      onChange={(e) => setHostInstruction(e.target.value)}
                      placeholder="Type a concise instruction… e.g. 'Ask about implementation challenges.'"
                      className="min-h-[72px] resize-none border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-300"
                    />

                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-indigo-700">
                        {hostInstruction.trim()
                          ? 'AI will use your instruction for its next response'
                          : 'Select a preset or write a custom instruction above'}
                      </p>
                      <Button
                        onClick={handleSendWithInstruction}
                        size="sm"
                        disabled={!hostInstruction.trim() || isSending}
                        className="bg-indigo-500 hover:bg-indigo-400 text-white h-8 text-xs px-3 shrink-0"
                      >
                        {isSending ? (
                          <span className="flex items-center gap-1.5">
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
                            Generating…
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5">
                            <SendHorizonal className="h-3.5 w-3.5" />
                            Send
                          </span>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </ScrollArea>
        ) : (
          /* Transcript Tab */
          <ScrollArea className="h-full">
            <div className="p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="py-16 text-center text-slate-500">
                  <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
                    <MessageSquare className="h-5 w-5 text-slate-500" />
                  </div>
                  <p className="text-sm font-medium text-slate-900">No messages yet</p>
                  <p className="mt-1 text-xs text-slate-500">Messages will appear once participants respond.</p>
                </div>
              ) : (
                messages.map((message, index) => {
                  const isAI = message.sender === 'assistant';
                  return (
                    <div key={message.id || index} className={`flex gap-3 ${isAI ? '' : 'flex-row-reverse'}`}>
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${
                        isAI ? 'bg-gradient-to-br from-indigo-500 to-violet-600' : 'bg-slate-500'
                      }`}>
                        {isAI
                          ? (conversationData?.sessions?.facilitator_details?.title || 'AI')[0]
                          : (message.participant || 'P')[0]?.toUpperCase()
                        }
                      </div>
                      <div className={`flex-1 max-w-[85%] ${isAI ? '' : 'flex flex-col items-end'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-slate-700">
                            {isAI
                              ? (conversationData?.sessions?.facilitator_details?.title || 'AI Facilitator')
                              : message.sender === 'admin'
                                ? 'Host'
                                : (participants.find(p => String(p.id) === message.participant)?.name || message.name || 'Participant')
                            }
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {message.timestamp?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || ''}
                          </span>
                        </div>
                        <div className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                          isAI
                            ? 'rounded-tl-sm border border-slate-200 bg-slate-100 text-slate-700 shadow-sm'
                            : 'rounded-tr-sm bg-indigo-600 text-white'
                        }`}>
                          {message.content}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
};

export default SimplifiedHostMessagingView;
