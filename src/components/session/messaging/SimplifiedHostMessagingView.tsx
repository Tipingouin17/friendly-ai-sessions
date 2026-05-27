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
  Activity, Clock, Sparkles, ShieldCheck
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
  enabledTools = [],
  isLoadingToolbox = false,
  toolboxError = null,
  enabledModes = [],
  activeMode = null,
  recentModeEvents = [],
  isLoadingModes = false,
  modeError = null,
  onStartMode,
  onApproveMode,
  onEndMode,
  onRejectMode,
  facilitatorVoiceGender = null,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'messages'>('overview');
  const [hostInstruction, setHostInstruction] = useState('');
  const [isInstructionExpanded, setIsInstructionExpanded] = useState(false);
  const [selectedModeKey, setSelectedModeKey] = useState<string>('');
  const [modePrompt, setModePrompt] = useState('');
  const [isModeBusy, setIsModeBusy] = useState(false);
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

  const facilitatorVoiceGenderLabel = facilitatorVoiceGender === 'female' ? 'Female voice' : facilitatorVoiceGender === 'male' ? 'Male voice' : 'Default voice';

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

  const selectedMode = enabledModes.find((mode) => mode.mode_key === selectedModeKey) || enabledModes[0] || null;
  const activeModeDefinition = activeMode?.facilitation_mode;
  const isPendingHostApproval = activeMode?.status === 'recommended' || activeMode?.status === 'pending_host_confirmation';

  const handleStartSelectedMode = async () => {
    if (!selectedMode || !onStartMode) return;
    setIsModeBusy(true);
    try {
      await onStartMode(selectedMode, modePrompt.trim() || undefined);
      setModePrompt('');
      setSelectedModeKey(selectedMode.mode_key);
    } finally {
      setIsModeBusy(false);
    }
  };

  const handleApproveActiveMode = async () => {
    if (!onApproveMode) return;
    setIsModeBusy(true);
    try {
      await onApproveMode('Host approved the recommended facilitation mode.');
    } finally {
      setIsModeBusy(false);
    }
  };

  const handleEndActiveMode = async () => {
    if (!onEndMode) return;
    setIsModeBusy(true);
    try {
      await onEndMode('Host ended the active facilitation mode.');
    } finally {
      setIsModeBusy(false);
    }
  };

  const handleRejectActiveMode = async () => {
    if (!onRejectMode) return;
    setIsModeBusy(true);
    try {
      await onRejectMode('Host rejected the recommended facilitation mode.');
    } finally {
      setIsModeBusy(false);
    }
  };

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
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
            activeTab === 'overview'
              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/60'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Activity className="h-3.5 w-3.5" />
          Overview
        </button>
        <button
          onClick={() => setActiveTab('messages')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
            activeTab === 'messages'
              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/60'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          Messages
          {messages.length > 0 && (
            <span className="ml-1 inline-flex items-center justify-center min-w-[1.1rem] h-4 px-1 rounded-full text-[10px] font-semibold bg-slate-200 text-slate-600">
              {messages.length}
            </span>
          )}
        </button>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'overview' ? (
          <ScrollArea className="h-full">
            <div className="p-5 space-y-4">

              {/* Host Command Center */}
              <div className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-white via-indigo-50/50 to-violet-50/60 p-4 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">Next facilitation move</p>
                    <h2 className="mt-1 font-display text-xl font-bold tracking-tight text-slate-950">Guide the room from one clear command surface.</h2>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span className="session-chip border-indigo-200 bg-white/80 text-indigo-700">Mode: {activeModeDefinition?.display_name || 'Open Discussion'}</span>
                      <span className="session-chip border-violet-200 bg-white/80 text-violet-700">TTS: {facilitatorVoiceGenderLabel}</span>
                      {isSessionPaused && <span className="session-chip border-amber-200 bg-white/80 text-amber-700">Paused</span>}
                      {isSessionEnded && <span className="session-chip border-slate-200 bg-white/80 text-slate-700">Ended</span>}
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[320px]">
                    <Button
                      onClick={handleContinueNormal}
                      disabled={!onTriggerFacilitatorResponse || isSending || isSessionEnded}
                      className="h-10 justify-center bg-indigo-600 text-xs font-semibold text-white shadow-sm shadow-indigo-100 hover:bg-indigo-500"
                    >
                      {isSending ? 'Generating…' : isWaitingForResponses ? 'Continue now' : 'Generate next turn'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsInstructionExpanded(true)}
                      className="h-10 border-indigo-200 bg-white/80 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
                    >
                      Steer privately
                    </Button>
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

              {/* Facilitator Capability Summary */}
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">AI capabilities</p>
                    <p className="mt-0.5 text-xs text-slate-500">Quiet context only; the host does not need to manage these during the live flow.</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {isLoadingToolbox && <span className="session-chip border-slate-200 bg-slate-50 text-slate-600">Loading…</span>}
                    {!isLoadingToolbox && enabledTools.slice(0, 3).map((tool) => (
                      <span key={tool.access_id || tool.id} className="session-chip border-slate-200 bg-slate-50 text-slate-600">{tool.name}</span>
                    ))}
                    {!isLoadingToolbox && enabledTools.length > 3 && (
                      <span className="session-chip border-slate-200 bg-slate-50 text-slate-600">+{enabledTools.length - 3} more</span>
                    )}
                    {!isLoadingToolbox && enabledTools.length === 0 && !toolboxError && (
                      <span className="session-chip border-slate-200 bg-slate-50 text-slate-600">No tools assigned</span>
                    )}
                  </div>
                </div>
                {toolboxError && (
                  <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">{toolboxError}</p>
                )}
              </div>

              {/* Facilitation Mode Orchestrator */}
              <div className="session-soft-panel rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Facilitation modes</p>
                    <p className="mt-0.5 text-xs text-slate-500">Change how participants contribute when the conversation needs structure.</p>
                  </div>
                  <span className={`session-chip px-2.5 py-1 text-xs font-semibold ${activeMode ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-600'}`}>
                    {isLoadingModes ? 'Loading…' : activeMode ? activeMode.status : `${enabledModes.length} available`}
                  </span>
                </div>

                {modeError && (
                  <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">{modeError}</p>
                )}

                {activeMode ? (
                  <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-xs font-semibold text-emerald-800">Active: {activeModeDefinition?.display_name || 'Facilitation mode'}</p>
                        <p className="mt-1 text-xs text-emerald-700">{activeMode.prompt || activeModeDefinition?.composer_copy || 'Participants are guided by this mode until the host ends it.'}</p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        {isPendingHostApproval && (
                          <>
                            <Button
                              onClick={handleApproveActiveMode}
                              size="sm"
                              disabled={!onApproveMode || isModeBusy}
                              className="h-8 bg-emerald-500 text-xs text-white hover:bg-emerald-400"
                            >
                              <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                              Approve
                            </Button>
                            <Button
                              onClick={handleRejectActiveMode}
                              variant="outline"
                              size="sm"
                              disabled={isModeBusy}
                              className="h-8 border-emerald-200 text-xs text-emerald-700 hover:bg-emerald-100"
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        <Button
                          onClick={handleEndActiveMode}
                          size="sm"
                          disabled={isModeBusy}
                          className="h-8 bg-emerald-500 text-xs text-white hover:bg-emerald-400"
                        >
                          {isPendingHostApproval ? 'Dismiss' : 'End mode'}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 space-y-3">
                    <div className="grid gap-2 md:grid-cols-2">
                      {enabledModes.map((mode) => (
                        <button
                          key={mode.access_id || mode.id}
                          type="button"
                          onClick={() => setSelectedModeKey(mode.mode_key)}
                          className={`session-control-button rounded-2xl border px-3 py-2.5 text-left transition-colors ${selectedMode?.mode_key === mode.mode_key ? 'border-indigo-300 bg-indigo-50 shadow-sm' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                        >
                          <p className="text-xs font-semibold text-slate-900">{mode.display_name}</p>
                          <p className="mt-1 line-clamp-1 text-xs text-slate-500">{mode.purpose}</p>
                        </button>
                      ))}
                    </div>
                    {!isLoadingModes && enabledModes.length === 0 && !modeError && (
                      <p className="session-soft-panel rounded-xl px-3 py-2 text-xs text-slate-500">No active facilitation modes are assigned to this facilitator yet.</p>
                    )}
                    {enabledModes.length > 0 && (
                      <div className="space-y-2">
                        <Textarea
                          value={modePrompt}
                          onChange={(event) => setModePrompt(event.target.value)}
                          placeholder="Optional participant prompt… e.g. 'Vote on the most important risk.'"
                          className="min-h-[64px] resize-none border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400"
                        />
                        <Button
                          onClick={handleStartSelectedMode}
                          size="sm"
                          disabled={!selectedMode || !onStartMode || isModeBusy}
                          className="h-8 bg-indigo-500 text-xs text-white hover:bg-indigo-400"
                        >
                          {isModeBusy ? 'Starting…' : `Start ${selectedMode?.display_name || 'mode'}`}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>

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
                      <span className="text-xs text-indigo-200">
                        {hostInstruction.trim()
                          ? 'AI will use your instruction for its next response'
                          : 'Select a preset or write a custom instruction above'}
                      </span>
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
          /* Messages Tab */
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
