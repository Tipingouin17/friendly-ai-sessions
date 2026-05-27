/**
 * Base Participant List
 *
 * Session component for the AIfacilitator application.
 */

import React, { useEffect, useState } from 'react';
import { ParticipantInfo, Message } from "@/types/chat";
import { Users, Search, Hand } from "lucide-react";
import { useParticipantRemoval } from "@/hooks/useParticipantRemoval";
import { useParticipantRealtime } from "@/hooks/useParticipantRealtime";
import ParticipantListItem from "@/components/session/participant/ParticipantListItem";
import EmptyParticipantList from "@/components/session/participant/EmptyParticipantList";
import ParticipantListSkeleton from "@/components/session/participant/ParticipantListSkeleton";
import AdminMessageInput from "@/components/session/AdminMessageInput";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

// Simple local logger to avoid import issues
const createLogger = (component: string, category: string) => ({
  category: (cat: string, message: string, ...data: any[]) => { /* no-op */ }
});

interface BaseParticipantListProps {
  participants: ParticipantInfo[];
  currentParticipantCount: number;
  maxParticipants: number;
  isLoading: boolean;
  conversationData: any;
  messages?: Message[];
  onSendMessage?: (message: string, isPinned: boolean, recipientId?: string) => void;
  title?: string;
  showMessageInput?: boolean;
  isHostView?: boolean;
}

/** Inner panel content — shared between desktop sidebar and mobile sheet */
const ParticipantPanelContent: React.FC<{
  title: string;
  actualParticipantCount: number;
  maxParticipants: number;
  searchTerm: string;
  onSearchChange: (v: string) => void;
  isLoadingParticipants: boolean;
  filteredParticipants: ParticipantInfo[];
  responseRate: number;
  waitingCount: number;
  removeParticipant: (id: number) => void;
  isRemoving: number | null;
  getParticipantMessageCount: (id: number) => number;
  getParticipantLastActive: (id: number) => Date | undefined;
  showMessageInput: boolean;
  onSendMessage?: (message: string, isPinned: boolean, recipientId?: string) => void;
  effectiveParticipants: ParticipantInfo[];
  isHostView: boolean;
}> = ({
  title,
  actualParticipantCount,
  maxParticipants,
  searchTerm,
  onSearchChange,
  isLoadingParticipants,
  filteredParticipants,
  responseRate,
  waitingCount,
  removeParticipant,
  isRemoving,
  getParticipantMessageCount,
  getParticipantLastActive,
  showMessageInput,
  onSendMessage,
  effectiveParticipants,
  isHostView,
}) => (
  <div className={`flex h-full min-h-0 flex-col bg-white ${isHostView ? 'rounded-none' : ''}`}>
    {/* Header */}
    <div className="shrink-0 border-b border-slate-200 bg-white px-5 py-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="flex min-w-0 items-center gap-2.5 text-lg font-bold tracking-tight text-slate-950">
          <Users className="h-4.5 w-4.5 shrink-0 text-indigo-500" />
          <span className="truncate">{title}</span>
        </h3>
        <div className="flex shrink-0 items-center gap-2">
          {waitingCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-100 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
              <Hand className="h-3.5 w-3.5" />
              {waitingCount}
            </span>
          )}
          <span className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-sm font-bold text-indigo-600 shadow-sm shadow-indigo-100">
            {actualParticipantCount}/{maxParticipants || "∞"}
          </span>
        </div>
      </div>

      <div className="mb-4 space-y-2">
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>Response rate</span>
          <span className="font-semibold text-emerald-600">{responseRate}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${responseRate}%` }}
          />
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="Search participants..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-12 rounded-2xl border-slate-200 bg-slate-50 pl-11 text-base text-slate-700 placeholder:text-slate-400 focus:bg-white"
        />
      </div>
    </div>

    {/* List */}
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="px-4 py-4">
        {isLoadingParticipants ? (
          <ParticipantListSkeleton count={actualParticipantCount || 1} />
        ) : filteredParticipants.length > 0 ? (
          <div className="space-y-1.5">
            {filteredParticipants.map((participant) => (
              <ParticipantListItem
                key={participant.id}
                participant={participant}
                onRemove={removeParticipant}
                messageCount={getParticipantMessageCount(participant.id)}
                lastActiveTime={getParticipantLastActive(participant.id)}
                isRemoving={isRemoving === participant.id}
              />
            ))}
          </div>
        ) : searchTerm ? (
          <div className="text-center py-8 text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">No participants found</p>
            <p className="text-xs text-gray-400">Try adjusting your search</p>
          </div>
        ) : (
          <EmptyParticipantList />
        )}
      </div>
    </div>

    {/* Message Input */}
    {showMessageInput && onSendMessage && (
      <div className="shrink-0 border-t border-slate-200 bg-white shadow-[0_-10px_28px_rgba(15,23,42,0.04)]">
        <AdminMessageInput
          onSendMessage={onSendMessage}
          participants={effectiveParticipants}
        />
      </div>
    )}
  </div>
);

const BaseParticipantList: React.FC<BaseParticipantListProps> = ({
  participants,
  currentParticipantCount,
  maxParticipants,
  isLoading,
  conversationData,
  messages = [],
  onSendMessage,
  title = "Participants",
  showMessageInput = true,
  isHostView = false
}) => {
  const logger = createLogger('BaseParticipantList', 'participants');

  const [participantsList, setParticipantsList] = useState<ParticipantInfo[]>(
    isHostView ? [] : participants
  );
  const [isLoadingParticipants, setIsLoadingParticipants] = useState(isLoading);
  const [searchTerm, setSearchTerm] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!isHostView && participants && participants.length >= 0) {
      setParticipantsList(participants);
    }
    setIsLoadingParticipants(isLoading);
  }, [participants, isLoading, isHostView]);

  const effectiveParticipants = isHostView ? participants : participantsList;

  const {
    displayCount,
    setDisplayCount,
    removeParticipant,
    isRemoving
  } = useParticipantRemoval({
    conversationId: conversationData?.id || null,
    currentParticipantCount: effectiveParticipants.length,
    setParticipantsList: isHostView ? () => { /* no-op */ } : setParticipantsList
  });

  useEffect(() => {
    setDisplayCount(effectiveParticipants.length);
  }, [effectiveParticipants, setDisplayCount]);

  useParticipantRealtime({
    conversationId: !isHostView ? (conversationData?.id || null) : null,
    participants: participantsList,
    setParticipants: setParticipantsList,
    setIsLoading: setIsLoadingParticipants,
    maxParticipants,
    enabled: !isHostView
  });

  const getParticipantMessageCount = (participantId: number) => {
    return messages.filter(msg =>
      msg.sender === 'user' &&
      msg.participant === String(participantId)
    ).length;
  };

  const getParticipantLastActive = (participantId: number) => {
    const participantMessages = messages.filter(msg =>
      msg.sender === 'user' &&
      msg.participant === String(participantId)
    );
    if (participantMessages.length === 0) return undefined;
    const lastMessage = participantMessages[participantMessages.length - 1];
    return lastMessage.timestamp || (lastMessage.created_at ? new Date(lastMessage.created_at) : undefined);
  };

  const filteredParticipants = effectiveParticipants.filter(participant => {
    const displayName = participant.name || `Participant ${participant.id}`;
    return displayName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const actualParticipantCount = effectiveParticipants.length;
  const participantResponseCount = effectiveParticipants.filter(participant => getParticipantMessageCount(participant.id) > 0).length;
  const responseRate = actualParticipantCount > 0
    ? Math.round((participantResponseCount / actualParticipantCount) * 100)
    : 0;
  const waitingCount = Math.max(actualParticipantCount - participantResponseCount, 0);

  const panelProps = {
    title,
    actualParticipantCount,
    maxParticipants,
    searchTerm,
    onSearchChange: setSearchTerm,
    isLoadingParticipants,
    filteredParticipants,
    responseRate,
    waitingCount,
    removeParticipant,
    isRemoving,
    getParticipantMessageCount,
    getParticipantLastActive,
    showMessageInput,
    onSendMessage,
    effectiveParticipants,
    isHostView,
  };

  return (
    <>
      {/* ── Mobile: floating button + Sheet ── */}
      <div className="md:hidden fixed bottom-4 right-4 z-30">
        <Button
          size="sm"
          variant="default"
          className="rounded-full shadow-lg flex items-center gap-1.5 pr-3"
          onClick={() => setMobileOpen(true)}
        >
          <Users className="h-4 w-4" />
          <span className="text-xs font-semibold">{actualParticipantCount}</span>
        </Button>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="right" className="flex w-[min(92vw,24rem)] flex-col p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>{title}</SheetTitle>
          </SheetHeader>
          <ParticipantPanelContent {...panelProps} />
        </SheetContent>
      </Sheet>

      {/* ── Desktop: full-height rail ── */}
      <div className={isHostView
        ? "hidden h-full min-h-0 w-full flex-col overflow-hidden bg-white md:flex"
        : "m-3 hidden h-[calc(100%-1.5rem)] w-[clamp(18rem,22vw,22rem)] min-w-[18rem] flex-col overflow-hidden rounded-r-3xl border border-slate-200 bg-white shadow-sm md:flex"
      }>
        <ParticipantPanelContent {...panelProps} />
      </div>
    </>
  );
};

export default BaseParticipantList;
