/**
 * Base Participant List
 *
 * Session component for the AIfacilitator application.
 */

import React, { useEffect, useState } from 'react';
import { ParticipantInfo, Message } from "@/types/chat";
import { Users, Search, X } from "lucide-react";
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
import { getScheduledStartIso } from "@/services/facilitatorService";

// Simple local logger to avoid import issues
const createLogger = (_component: string, _category: string) => ({
  category: (_cat: string, _message: string, ..._data: unknown[]) => { /* no-op */ }
});

interface BaseParticipantListProps {
  participants: ParticipantInfo[];
  currentParticipantCount: number;
  maxParticipants: number;
  isLoading: boolean;
  conversationData: { id?: number | null; flow_config?: unknown } | null | undefined;
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
  removeParticipant: (id: number) => void;
  isRemoving: number | null;
  getParticipantMessageCount: (id: number) => number;
  getParticipantLastActive: (id: number) => Date | undefined;
  showMessageInput: boolean;
  onSendMessage?: (message: string, isPinned: boolean, recipientId?: string) => void;
  effectiveParticipants: ParticipantInfo[];
}> = ({
  title,
  actualParticipantCount,
  maxParticipants,
  searchTerm,
  onSearchChange,
  isLoadingParticipants,
  filteredParticipants,
  removeParticipant,
  isRemoving,
  getParticipantMessageCount,
  getParticipantLastActive,
  showMessageInput,
  onSendMessage,
  effectiveParticipants,
}) => (
  <div className="flex flex-col h-full">
    {/* Header */}
    <div className="px-4 pt-4 pb-3 border-b border-slate-200 bg-white">
      <div className="flex items-center justify-between mb-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Users className="h-4 w-4 text-indigo-400" />
          {title}
        </h3>
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
          {actualParticipantCount}/{maxParticipants || "∞"}
        </span>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
        <Input
          placeholder="Search participants…"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8 h-8 text-xs bg-slate-50 border-slate-200 focus:bg-white"
        />
      </div>
    </div>

    {/* List */}
    <div className="flex-1 overflow-y-auto">
      <div className="p-4">
        {isLoadingParticipants ? (
          <ParticipantListSkeleton count={actualParticipantCount || 1} />
        ) : filteredParticipants.length > 0 ? (
          <div className="space-y-2">
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
      <div className="border-t border-gray-200">
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
  const isScheduledSession = Boolean(getScheduledStartIso(conversationData?.flow_config));

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
    enabled: !isHostView,
    disableAutoStart: isScheduledSession
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

  const panelProps = {
    title,
    actualParticipantCount,
    maxParticipants,
    searchTerm,
    onSearchChange: setSearchTerm,
    isLoadingParticipants,
    filteredParticipants,
    removeParticipant,
    isRemoving,
    getParticipantMessageCount,
    getParticipantLastActive,
    showMessageInput,
    onSendMessage,
    effectiveParticipants,
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
        <SheetContent side="right" className="p-0 w-[85vw] max-w-sm flex flex-col">
          <SheetHeader className="sr-only">
            <SheetTitle>{title}</SheetTitle>
          </SheetHeader>
          <ParticipantPanelContent {...panelProps} />
        </SheetContent>
      </Sheet>

      {/* ── Desktop: fixed sidebar ── */}
      <div className="w-72 bg-white m-3 rounded-r-2xl border border-slate-200 shadow-sm flex-col h-[calc(100%-1.5rem)] hidden md:flex overflow-hidden">
        <ParticipantPanelContent {...panelProps} />
      </div>
    </>
  );
};

export default BaseParticipantList;
