
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { ParticipantInfo, Message } from "@/types/chat";
import { Users, Search } from "lucide-react";
import { useParticipantRemoval } from "@/hooks/useParticipantRemoval";
import { useParticipantRealtime } from "@/hooks/useParticipantRealtime";
import ParticipantListItem from "@/components/session/participant/ParticipantListItem";
import EmptyParticipantList from "@/components/session/participant/EmptyParticipantList";
import ParticipantListSkeleton from "@/components/session/participant/ParticipantListSkeleton";
import AdminMessageInput from "@/components/session/AdminMessageInput";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

// Simple local logger to avoid import issues
const createLogger = (component: string, category: string) => ({
  category: (cat: string, message: string, ...data: any[]) => {
    console.log(`[${cat.toUpperCase()}] ${component}: ${message}`, ...data);
  }
});

interface StabilizedParticipantListProps {
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

const StabilizedParticipantList: React.FC<StabilizedParticipantListProps> = React.memo(({
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
  const logger = createLogger('StabilizedParticipantList', 'participants');
  
  // Debounced state updates to prevent rapid re-renders
  const [debouncedParticipants, setDebouncedParticipants] = useState<ParticipantInfo[]>(participants);
  const [debouncedLoading, setDebouncedLoading] = useState(isLoading);
  const [searchTerm, setSearchTerm] = useState('');
  
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<number>(0);

  // Debounce participant updates to prevent rapid blinking
  useEffect(() => {
    const now = Date.now();
    
    // Only update if participants actually changed and enough time has passed
    const participantsChanged = 
      participants.length !== debouncedParticipants.length ||
      participants.some((p, i) => 
        !debouncedParticipants[i] || 
        p.id !== debouncedParticipants[i].id ||
        p.name !== debouncedParticipants[i].name
      );

    if (participantsChanged && now - lastUpdateRef.current > 500) { // 500ms debounce
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      
      debounceTimeoutRef.current = setTimeout(() => {
        setDebouncedParticipants(participants);
        lastUpdateRef.current = Date.now();
        logger.category('participants', `Debounced update: ${participants.length} participants`);
      }, 200);
    }

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [participants, debouncedParticipants, logger]);

  // Debounce loading state
  useEffect(() => {
    const loadingTimeout = setTimeout(() => {
      setDebouncedLoading(isLoading);
    }, 100);

    return () => clearTimeout(loadingTimeout);
  }, [isLoading]);

  // Memoized participant removal hook
  const { 
    displayCount, 
    setDisplayCount, 
    removeParticipant,
    isRemoving
  } = useParticipantRemoval({
    conversationId: conversationData?.id || null,
    currentParticipantCount: debouncedParticipants.length,
    setParticipantsList: () => {} // Host view doesn't need this
  });
  
  // Stable display count
  useEffect(() => {
    const actualCount = debouncedParticipants.length;
    if (Math.abs(displayCount - actualCount) > 0) {
      setDisplayCount(actualCount);
    }
  }, [debouncedParticipants.length, displayCount, setDisplayCount]);

  // Memoized message count calculation
  const getParticipantMessageCount = useMemo(() => {
    const messageCountMap = new Map<number, number>();
    messages.forEach(msg => {
      if (msg.sender === 'user' && msg.participant) {
        const participantId = parseInt(msg.participant.replace('P', ''));
        messageCountMap.set(participantId, (messageCountMap.get(participantId) || 0) + 1);
      }
    });
    return (participantId: number) => messageCountMap.get(participantId) || 0;
  }, [messages]);
  
  // Memoized last active calculation
  const getParticipantLastActive = useMemo(() => {
    const lastActiveMap = new Map<number, Date>();
    messages.forEach(msg => {
      if (msg.sender === 'user' && msg.participant) {
        const participantId = parseInt(msg.participant.replace('P', ''));
        const timestamp = msg.timestamp || (msg.created_at ? new Date(msg.created_at) : new Date());
        const existing = lastActiveMap.get(participantId);
        if (!existing || timestamp > existing) {
          lastActiveMap.set(participantId, timestamp);
        }
      }
    });
    return (participantId: number) => lastActiveMap.get(participantId);
  }, [messages]);
  
  // Memoized filtered participants
  const filteredParticipants = useMemo(() => {
    return debouncedParticipants.filter(participant => {
      const displayName = participant.name || `Participant ${participant.id}`;
      return displayName.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [debouncedParticipants, searchTerm]);

  const actualParticipantCount = debouncedParticipants.length;

  return (
    <div className="w-80 border-l border-gray-200 bg-white flex flex-col h-full hidden md:flex">
      {/* Header */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center justify-between mb-3">
          <h3 className="flex items-center gap-2 font-semibold text-gray-900">
            <Users className="h-5 w-5" /> 
            {title}
          </h3>
          <Badge variant="outline" className="bg-white transition-all duration-200">
            {actualParticipantCount}/{maxParticipants || "∞"}
          </Badge>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search participants..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
      </div>
      
      {/* Participants List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          {debouncedLoading ? (
            <ParticipantListSkeleton count={actualParticipantCount || 1} />
          ) : filteredParticipants.length > 0 ? (
            <div className="space-y-2">
              {filteredParticipants.map((participant) => (
                <ParticipantListItem
                  key={`participant-${participant.id}-${participant.name}`} // Stable key
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
            participants={debouncedParticipants}
          />
        </div>
      )}
    </div>
  );
});

StabilizedParticipantList.displayName = 'StabilizedParticipantList';

export default StabilizedParticipantList;
