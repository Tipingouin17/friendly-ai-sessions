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
import PreSessionHostView from '@/components/session/host/PreSessionHostView';
import {
  MessageSquare, Users, Wand2, SendHorizonal,
  ChevronDown, ChevronUp, Zap, TrendingUp, BarChart2,
  Activity, CheckCircle2, Clock, Sparkles
} from 'lucide-react';

interface SimplifiedHostMessagingViewProps {
  messages: Message[];
  participantColors: { [key: string]: string };
  currentParticipantCount: number;
  conversationData: any;
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
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'messages'>('overview');
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
                <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-1 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Participants</span>
                    <Users className="h-3.5 w-3.5 text-indigo-400" />
                  </div>
                  <span className="text-2xl font-bold text-slate-900">{currentParticipantCount}</span>
                  <span className="text-xs text-slate-400">in session</span>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-1 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Response Rate</span>
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                  </div>
                  <span className="text-2xl font-bold text-slate-900">{responseRate}%</span>
                  <span className="text-xs text-slate-400">{responseCount} / {totalParticipants} responded</span>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-1 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">AI Exchanges</span>
                    <Sparkles className="h-3.5 w-3.5 text-violet-400" />
                  </div>
                  <span className="text-2xl font-bold text-slate-900">{facilitatorMessages.length}</span>
                  <span className="text-xs text-slate-400">facilitator messages</span>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-1 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Avg Responses</span>
                    <BarChart2 className="h-3.5 w-3.5 text-sky-400" />
                  </div>
                  <span className="text-2xl font-bold text-slate-900">{avgMessagesPerParticipant}</span>
                  <span className="text-xs text-slate-400">per participant</span>
                </div>
              </div>

              {/* Response Collection Progress */}
              {isWaitingForResponses && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-amber-500" />
                      <span className="text-sm font-semibold text-slate-800">Collecting Responses</span>
                    </div>
                    <span className="text-xs font-medium text-slate-500">
                      {responseCount} of {totalParticipants}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 mb-3 overflow-hidden">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
                      style={{ width: totalParticipants > 0 ? `${(responseCount / totalParticipants) * 100}%` : '0%' }}
                    />
                  </div>
                  {onTriggerFacilitatorResponse && (
                    <Button
                      onClick={handleContinueNormal}
                      variant="outline"
                      size="sm"
                      disabled={isSending}
                      className="text-xs h-7 border-slate-300 text-slate-700 hover:bg-slate-50"
                    >
                      {isSending ? (
                        <span className="flex items-center gap-1.5">
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-indigo-600" />
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
              <div className={`rounded-xl border shadow-sm overflow-hidden transition-all ${
                isInstructionExpanded
                  ? 'border-indigo-300 bg-gradient-to-br from-indigo-50 to-violet-50'
                  : 'border-slate-200 bg-white'
              }`}>
                <button
                  className="w-full flex items-center justify-between px-4 py-3.5 text-left"
                  onClick={() => setIsInstructionExpanded(!isInstructionExpanded)}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`p-1.5 rounded-lg ${isInstructionExpanded ? 'bg-indigo-600' : 'bg-slate-100'}`}>
                      <Wand2 className={`h-3.5 w-3.5 ${isInstructionExpanded ? 'text-white' : 'text-slate-500'}`} />
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${isInstructionExpanded ? 'text-indigo-900' : 'text-slate-800'}`}>
                        Steer the AI Facilitator
                      </p>
                      <p className="text-xs text-slate-500">Participants won't see your instruction</p>
                    </div>
                  </div>
                  {isInstructionExpanded
                    ? <ChevronUp className="h-4 w-4 text-indigo-500" />
                    : <ChevronDown className="h-4 w-4 text-slate-400" />
                  }
                </button>

                {isInstructionExpanded && (
                  <div className="px-4 pb-4 space-y-3 border-t border-indigo-100">
                    <div className="flex flex-wrap gap-2 pt-3">
                      {quickInstructions.map((qi) => (
                        <button
                          key={qi.label}
                          onClick={() => setHostInstruction(qi.instruction)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                            hostInstruction === qi.instruction
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50'
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
                      className="min-h-[72px] resize-none bg-white border-indigo-200 focus:border-indigo-400 text-sm placeholder:text-slate-400"
                    />

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-indigo-600">
                        {hostInstruction.trim()
                          ? 'AI will use your instruction for its next response'
                          : 'Select a preset or write a custom instruction above'}
                      </span>
                      <Button
                        onClick={handleSendWithInstruction}
                        size="sm"
                        disabled={!hostInstruction.trim() || isSending}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white h-8 text-xs px-3 shrink-0"
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
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Session Details</p>
                <div className="space-y-2.5">
                  <div className="flex items-start gap-2">
                    <Zap className="h-3.5 w-3.5 text-indigo-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-400">Title</p>
                      <p className="text-sm font-medium text-slate-800">
                        {conversationData?.sessions?.title || 'Untitled Session'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-violet-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-400">Facilitator</p>
                      <p className="text-sm font-medium text-slate-800">
                        {conversationData?.sessions?.facilitator_details?.title || 'Unknown'}
                      </p>
                    </div>
                  </div>
                  {conversationData?.sessions?.objective && (
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-slate-400">Objective</p>
                        <p className="text-sm text-slate-700 leading-relaxed">
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
                <div className="text-center py-16">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-100 mb-3">
                    <MessageSquare className="h-5 w-5 text-slate-400" />
                  </div>
                  <p className="text-sm font-medium text-slate-600">No messages yet</p>
                  <p className="text-xs text-slate-400 mt-1">Messages will appear once participants respond.</p>
                </div>
              ) : (
                messages.map((message, index) => {
                  const isAI = message.sender === 'assistant';
                  return (
                    <div key={message.id || index} className={`flex gap-3 ${isAI ? '' : 'flex-row-reverse'}`}>
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${
                        isAI ? 'bg-gradient-to-br from-indigo-500 to-violet-600' : 'bg-slate-400'
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
                          <span className="text-[10px] text-slate-400">
                            {message.timestamp?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || ''}
                          </span>
                        </div>
                        <div className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                          isAI
                            ? 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm'
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
