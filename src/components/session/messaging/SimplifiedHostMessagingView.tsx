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
import type { FacilitatorModeAssignment, SessionActiveMode, SessionModeEvent } from '@/services/modeOrchestratorService';
import PreSessionHostView from '@/components/session/host/PreSessionHostView';
import {
  MessageSquare, Users, Wand2, SendHorizonal,
  ChevronDown, ChevronUp, Zap, TrendingUp, BarChart2,
  Activity, CheckCircle2, Clock, Sparkles, ShieldCheck
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

  const facilitatorMessages = messages.filter(m => m.sender === 'assistant');
  const participantMessages = messages.filter(m => m.sender === 'user');

  // Derived metrics
  const responseRate = totalParticipants > 0
    ? Math.round((responseCount / totalParticipants) * 100)
    : 0;
  const avgMessagesPerParticipant = currentParticipantCount > 0
    ? (participantMessages.length / currentParticipantCount).toFixed(1)
    : '0';

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
      icon: '🏁',
      instruction: 'The host has decided to end the session now. Do NOT ask another question. Instead: (1) warmly thank all participants for their contributions, (2) synthesize the 2-3 most important insights that emerged from the discussion, (3) share a brief closing thought or call to action relevant to the session objective, and (4) formally close the session.'
    },
    {
      label: 'Final round',
      icon: '🎯',
      instruction: 'This is the last question of the session. Ask one final, meaningful question that invites participants to share their single most important takeaway or commitment from today\'s discussion. After collecting responses, you will close the session.'
    },
    {
      label: 'Go deeper',
      icon: '🔍',
      instruction: 'Go deeper on the current topic. Ask a more specific, probing follow-up question that challenges participants to think beyond their initial answers.'
    },
    {
      label: 'Change topic',
      icon: '↗️',
      instruction: 'Transition to a new aspect of the workshop topic that has not been discussed yet. Briefly acknowledge what was shared so far, then pivot naturally.'
    },
    {
      label: 'Be practical',
      icon: '⚡',
      instruction: 'Focus on practical, actionable examples. Ask participants to share concrete implementation ideas or next steps they could take within the next week.'
    },
    {
      label: 'Open floor',
      icon: '🎤',
      instruction: 'Open the floor for participants to raise any topic, question, or concern they feel has not been addressed yet in the session. Invite them to share freely.'
    },
  ];

  const statusConfig = isSessionEnded
    ? { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500', label: 'Ended', pulse: false }
    : isSessionPaused
    ? { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500', label: 'Paused', pulse: false }
    : { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Live', pulse: true };

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

        {/* Status pill */}
        <div className="ml-auto flex items-center gap-2 pb-1">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${statusConfig.bg} ${statusConfig.text}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${statusConfig.dot} ${statusConfig.pulse ? 'animate-pulse' : ''}`} />
            {statusConfig.label}
          </span>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'overview' ? (
          <ScrollArea className="h-full">
            <div className="p-5 space-y-4">

              {/* Metric Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="session-soft-panel rounded-2xl p-4 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-300 uppercase tracking-wide">Participants</span>
                    <Users className="h-3.5 w-3.5 text-indigo-200" />
                  </div>
                  <span className="text-2xl font-bold text-white">{currentParticipantCount}</span>
                  <span className="text-xs text-slate-300">in session</span>
                </div>

                <div className="session-soft-panel rounded-2xl p-4 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-300 uppercase tracking-wide">Response Rate</span>
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-200" />
                  </div>
                  <span className="text-2xl font-bold text-white">{responseRate}%</span>
                  <span className="text-xs text-slate-300">{responseCount} / {totalParticipants} responded</span>
                </div>

                <div className="session-soft-panel rounded-2xl p-4 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-300 uppercase tracking-wide">AI Exchanges</span>
                    <Sparkles className="h-3.5 w-3.5 text-violet-200" />
                  </div>
                  <span className="text-2xl font-bold text-white">{facilitatorMessages.length}</span>
                  <span className="text-xs text-slate-300">facilitator messages</span>
                </div>

                <div className="session-soft-panel rounded-2xl p-4 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-300 uppercase tracking-wide">Avg Responses</span>
                    <BarChart2 className="h-3.5 w-3.5 text-sky-200" />
                  </div>
                  <span className="text-2xl font-bold text-white">{avgMessagesPerParticipant}</span>
                  <span className="text-xs text-slate-300">per participant</span>
                </div>
              </div>

              {/* Response Collection Progress */}
              {isWaitingForResponses && (
                <div className="session-soft-panel rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-amber-500" />
                      <span className="text-sm font-semibold text-white">Collecting Responses</span>
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
                      className="text-xs h-7 border-white/15 text-slate-100 hover:bg-white/10"
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

              {/* Facilitator Toolbox */}
              <div className="session-soft-panel rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">Facilitator toolbox</p>
                    <p className="text-xs text-slate-300 mt-0.5">The AI facilitator can choose among its assigned tools when generating the next response.</p>
                  </div>
                  <span className="session-chip border-indigo-300/30 bg-indigo-400/10 text-indigo-100">
                    {isLoadingToolbox ? 'Loading…' : `${enabledTools.length} active`}
                  </span>
                </div>
                {toolboxError && (
                  <p className="mt-3 rounded-xl border border-amber-300/25 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">{toolboxError}</p>
                )}
                {!isLoadingToolbox && enabledTools.length > 0 && (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {enabledTools.map((tool) => (
                      <div key={tool.access_id || tool.id} className="session-soft-panel rounded-xl px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-white">{tool.name}</p>
                          <span className="session-chip bg-white/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-200">{tool.category}</span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs text-slate-300">
                          {String(tool.effective_config?.hostCue || tool.description || 'Available for this facilitator')}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                {!isLoadingToolbox && enabledTools.length === 0 && !toolboxError && (
                  <p className="mt-3 session-soft-panel rounded-xl px-3 py-2 text-xs text-slate-500">No active tools are assigned to this facilitator yet.</p>
                )}
              </div>

              {/* Facilitation Mode Orchestrator */}
              <div className="session-soft-panel rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">Facilitation modes</p>
                    <p className="text-xs text-slate-300 mt-0.5">Start a structured mode that changes participant input rules and gives the facilitator an explicit lifecycle.</p>
                  </div>
                  <span className={`session-chip px-2.5 py-1 text-xs font-semibold ${activeMode ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-100' : 'border-white/10 bg-white/10 text-slate-200'}`}>
                    {isLoadingModes ? 'Loading…' : activeMode ? activeMode.status : `${enabledModes.length} available`}
                  </span>
                </div>

                {modeError && (
                  <p className="mt-3 rounded-xl border border-amber-300/25 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">{modeError}</p>
                )}

                {recentModeEvents.length > 0 && (
                  <div className="mt-3 rounded-xl border border-violet-300/25 bg-violet-400/10 px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-100">Recent mode events</p>
                    <div className="mt-1 space-y-1">
                      {recentModeEvents.slice(0, 3).map((event) => (
                        <div key={event.id} className="flex items-center justify-between gap-3 text-xs text-violet-100">
                          <span className="truncate">{event.event_type.replace(/_/g, ' ')}</span>
                          <span className="shrink-0 text-[11px] text-violet-200">
                            {event.created_at ? new Date(event.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'now'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeMode ? (
                  <div className="mt-3 rounded-xl border border-emerald-300/25 bg-emerald-400/10 px-3 py-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-xs font-semibold text-emerald-100">Active: {activeModeDefinition?.display_name || 'Facilitation mode'}</p>
                        <p className="mt-1 text-xs text-emerald-100/80">{activeMode.prompt || activeModeDefinition?.composer_copy || 'Participants are guided by this mode until the host ends it.'}</p>
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
                              className="h-8 border-emerald-300/30 text-xs text-emerald-100 hover:bg-emerald-400/10"
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
                    <div className="grid gap-2 sm:grid-cols-2">
                      {enabledModes.map((mode) => (
                        <button
                          key={mode.access_id || mode.id}
                          type="button"
                          onClick={() => setSelectedModeKey(mode.mode_key)}
                          className={`session-control-button rounded-xl border px-3 py-2 text-left transition-colors ${selectedMode?.mode_key === mode.mode_key ? 'border-indigo-300/50 bg-indigo-400/15' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                        >
                          <p className="text-xs font-semibold text-white">{mode.display_name}</p>
                          <p className="mt-1 line-clamp-2 text-xs text-slate-300">{mode.purpose}</p>
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
                          placeholder="Optional mode prompt for participants… e.g. 'Vote on the most important risk.'"
                          className="min-h-[64px] resize-none border-white/10 bg-slate-950/40 text-sm text-white placeholder:text-slate-400"
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
                  ? 'border-indigo-300/35 bg-indigo-400/10'
                  : ''
              }`}>
                <button
                  className="w-full flex items-center justify-between px-4 py-3.5 text-left"
                  onClick={() => setIsInstructionExpanded(!isInstructionExpanded)}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`p-1.5 rounded-lg ${isInstructionExpanded ? 'bg-indigo-500' : 'bg-white/10'}`}>
                      <Wand2 className={`h-3.5 w-3.5 ${isInstructionExpanded ? 'text-white' : 'text-slate-300'}`} />
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${isInstructionExpanded ? 'text-indigo-100' : 'text-white'}`}>
                        Steer the AI Facilitator
                      </p>
                      <p className="text-xs text-slate-300">Participants won't see your instruction</p>
                    </div>
                  </div>
                  {isInstructionExpanded
                    ? <ChevronUp className="h-4 w-4 text-indigo-200" />
                    : <ChevronDown className="h-4 w-4 text-slate-300" />
                  }
                </button>

                {isInstructionExpanded && (
                  <div className="px-4 pb-4 space-y-3 border-t border-white/10">
                    <div className="flex flex-wrap gap-2 pt-3">
                      {quickInstructions.map((qi) => (
                        <button
                          key={qi.label}
                          onClick={() => setHostInstruction(qi.instruction)}
                          className={`session-control-button inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                            hostInstruction === qi.instruction
                              ? 'bg-indigo-500 text-white border-indigo-400'
                              : 'bg-white/10 text-indigo-100 border-white/10 hover:bg-white/15'
                          }`}
                        >
                          <span>{qi.icon}</span>
                          {qi.label}
                        </button>
                      ))}
                    </div>

                    <Textarea
                      value={hostInstruction}
                      onChange={(e) => setHostInstruction(e.target.value)}
                      placeholder="Type a custom instruction… e.g. 'Ask about implementation challenges'"
                      className="min-h-[72px] resize-none bg-slate-950/40 border-white/10 focus:border-indigo-300 text-sm text-white placeholder:text-slate-400"
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

              {/* Session Details */}
              <div className="session-soft-panel rounded-2xl p-4">
                <p className="text-xs font-semibold text-slate-300 uppercase tracking-wide mb-3">Session Details</p>
                <div className="space-y-2.5">
                  <div className="flex items-start gap-2">
                    <Zap className="h-3.5 w-3.5 text-indigo-200 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-300">Title</p>
                      <p className="text-sm font-medium text-white">
                        {conversationData?.sessions?.title || 'Untitled Session'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-violet-200 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-300">Facilitator</p>
                      <p className="text-sm font-medium text-white">
                        {conversationData?.sessions?.facilitator_details?.title || 'Unknown'}
                      </p>
                    </div>
                  </div>
                  {conversationData?.sessions?.objective && (
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-200 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-slate-300">Objective</p>
                        <p className="text-sm text-slate-200 leading-relaxed">
                          {conversationData.sessions.objective}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </ScrollArea>
        ) : (
          /* Messages Tab */
          <ScrollArea className="h-full">
            <div className="p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="text-center py-16 text-slate-200">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white/10 mb-3">
                    <MessageSquare className="h-5 w-5 text-slate-300" />
                  </div>
                  <p className="text-sm font-medium text-slate-100">No messages yet</p>
                  <p className="text-xs text-slate-300 mt-1">Messages will appear once participants respond.</p>
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
                          <span className="text-xs font-semibold text-slate-200">
                            {isAI
                              ? (conversationData?.sessions?.facilitator_details?.title || 'AI Facilitator')
                              : message.sender === 'admin'
                                ? 'Host'
                                : (participants.find(p => String(p.id) === message.participant)?.name || message.name || 'Participant')
                            }
                          </span>
                          <span className="text-[10px] text-slate-300">
                            {message.timestamp?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || ''}
                          </span>
                        </div>
                        <div className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                          isAI
                            ? 'bg-white/10 border border-white/10 text-slate-100 rounded-tl-sm shadow-sm'
                            : 'bg-indigo-600 text-white rounded-tr-sm'
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
