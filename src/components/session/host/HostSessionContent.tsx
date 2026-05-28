/**
 * Host Session Content
 *
 * Session component for the AIfacilitator application.
 */

import React from "react";
import { CalendarClock, Mail, Wifi } from "lucide-react";
import SimplifiedHostMessagingView from "@/components/session/messaging/SimplifiedHostMessagingView";
import HostParticipantList from "@/components/session/HostParticipantList";
import { Message, ParticipantInfo } from "@/types/chat";
import { getScheduledStartIso, getSessionInvitations } from "@/services/facilitatorService";

interface HostSessionContentProps {
  sessionMessages: Message[];
  participantColors: { [key: string]: string };
  conversationData: any;
  participants: ParticipantInfo[];
  isLoadingParticipants: boolean;
  currentConversationId: number | null;
  onSendMessage?: (message: string, isPinned: boolean, recipientId?: string) => void;
  
  // Response collection props
  isWaitingForResponses?: boolean;
  responseCount?: number;
  totalParticipants?: number;
  onTriggerFacilitatorResponse?: (hostInstruction?: string) => void;
  
  // Session start props
  isSessionStarted?: boolean;
  onSessionStarted?: () => void;
  
  // Auto-start props
  isAutoStarting?: boolean;
  autoStartCountdown?: number;
  onCancelAutoStart?: () => void;

  // Session state
  isSessionEnded?: boolean;
  isSessionPaused?: boolean;
}

const HostSessionContent: React.FC<HostSessionContentProps> = ({
  sessionMessages,
  participantColors,
  conversationData,
  participants,
  isLoadingParticipants,
  currentConversationId,
  onSendMessage,
  isWaitingForResponses = false,
  responseCount = 0,
  totalParticipants = 1,
  onTriggerFacilitatorResponse,
  isSessionStarted = false,
  onSessionStarted,
  isAutoStarting = false,
  autoStartCountdown = 0,
  onCancelAutoStart,
  isSessionEnded = false,
  isSessionPaused = false,
}) => {
  // Use actual participant count from real-time data
  const actualParticipantCount = participants.length;
  const waitingParticipants = participants.filter((participant) => !participant.isHost && !participant.isAdmin);
  const maxParticipants = conversationData?.participants || Math.max(actualParticipantCount, 1);
  const scheduledStartIso = getScheduledStartIso(conversationData?.flow_config);
  const scheduledInvitations = getSessionInvitations(conversationData?.flow_config);
  const isScheduledSession = Boolean(scheduledStartIso);
  const scheduledStartLabel = scheduledStartIso
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(scheduledStartIso))
    : null;
  const joinedInviteeEmails = new Set(
    waitingParticipants
      .map((participant) => (participant as any).email)
      .filter(Boolean)
      .map((email: string) => email.toLowerCase())
  );
  const invitedReadinessRows = scheduledInvitations.map((invite) => {
    const joinedByEmail = joinedInviteeEmails.has(invite.email.toLowerCase());
    const joinedByName = waitingParticipants.some((participant) => (participant.name || "").trim().toLowerCase() === invite.name.trim().toLowerCase());
    return { ...invite, isReady: joinedByEmail || joinedByName };
  });
  const readyInviteeCount = invitedReadinessRows.filter((invite) => invite.isReady).length;
  const expectedInvitees = scheduledInvitations.length;

  return (
    <div className="flex-1 flex overflow-hidden bg-slate-100">
      {/* Main intelligence panel */}
      <div className="flex-1 overflow-hidden bg-white m-3 mr-0 rounded-l-2xl border border-slate-200 shadow-sm">
        {isScheduledSession && !isSessionStarted && !isSessionEnded && (
          <div className="border-b border-indigo-100 bg-indigo-50/80 px-5 py-4 text-slate-900">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex gap-3">
                <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-indigo-600 shadow-sm">
                  <CalendarClock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-700">Scheduled session</p>
                  <h2 className="mt-1 text-lg font-semibold text-slate-950">
                    {scheduledStartLabel ? `Reconnect here on ${scheduledStartLabel}` : "Reconnect here when the session begins"}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    This waiting area is ready now. Invitees can use the session link before the start time, and their readiness will appear here as they join.
                  </p>
                </div>
              </div>
              <div className="rounded-2xl border border-indigo-100 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
                <p className="font-semibold text-slate-950">{readyInviteeCount} of {expectedInvitees || maxParticipants} ready</p>
                <p>{expectedInvitees ? "Invitation roster" : "Open invite link"}</p>
              </div>
            </div>

            {invitedReadinessRows.length > 0 && (
              <div className="mt-4 overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-indigo-600" />
                    <p className="text-sm font-semibold text-slate-950">Invitation readiness</p>
                  </div>
                  <span className="text-xs font-medium text-slate-500">{readyInviteeCount} of {invitedReadinessRows.length} joined</span>
                </div>
                <div className="max-h-56 divide-y divide-slate-100 overflow-y-auto">
                  {invitedReadinessRows.map((invite) => (
                    <div key={invite.id} className="flex items-center justify-between gap-4 px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-950">{invite.name}</p>
                        <p className="truncate text-xs text-slate-500">{invite.email}</p>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${invite.isReady ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                        {invite.isReady ? <Wifi className="h-3.5 w-3.5" /> : <Mail className="h-3.5 w-3.5" />}
                        {invite.isReady ? "In waiting room" : "Invited"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <SimplifiedHostMessagingView
          messages={sessionMessages || []}
          participantColors={participantColors}
          currentParticipantCount={actualParticipantCount}
          conversationData={conversationData}
          isWaitingForResponses={isWaitingForResponses}
          responseCount={responseCount}
          totalParticipants={totalParticipants}
          onTriggerFacilitatorResponse={onTriggerFacilitatorResponse}
          isSessionStarted={isSessionStarted}
          onSessionStarted={onSessionStarted}
          participants={participants}
          conversationId={currentConversationId}
          isAutoStarting={isAutoStarting}
          autoStartCountdown={autoStartCountdown}
          onCancelAutoStart={onCancelAutoStart}
          isSessionEnded={isSessionEnded}
          isSessionPaused={isSessionPaused}
        />
      </div>

      {/* Participant sidebar */}
      <HostParticipantList
        participants={participants || []}
        currentParticipantCount={actualParticipantCount}
        maxParticipants={conversationData?.participants || 10}
        isLoading={isLoadingParticipants}
        conversationData={conversationData}
        messages={sessionMessages}
        onSendMessage={onSendMessage}
      />
    </div>
  );
};

export default HostSessionContent;
