
import React, { useEffect, useState } from 'react';
import { ParticipantInfo } from "@/types/chat";
import { Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { removeChannel } from "@/utils/realtimeHelpers";
import { Skeleton } from "@/components/ui/skeleton";

interface AdminParticipantListProps {
  participants: ParticipantInfo[];
  currentParticipantCount: number;
  maxParticipants: number;
  isLoading: boolean;
  conversationData: any;
}

const AdminParticipantList: React.FC<AdminParticipantListProps> = ({
  participants,
  currentParticipantCount,
  maxParticipants,
  isLoading,
  conversationData
}) => {
  const [displayCount, setDisplayCount] = useState(currentParticipantCount);
  
  useEffect(() => {
    if (!conversationData?.id) return;
    
    const conversationId = conversationData.id;
    
    // Use the higher number between actual participants array length and current_participants count
    setDisplayCount(Math.max(participants.length, currentParticipantCount));
    
    const conversationChannel = supabase
      .channel(`admin-conversation-updates-${conversationId}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'conversations',
        filter: `id=eq.${conversationId}`
      }, (payload) => {
        console.log("Admin received conversation update:", payload);
        
        if (payload.new && payload.new.current_participants !== undefined) {
          console.log("Updating admin participant count display:", payload.new.current_participants);
          setDisplayCount(payload.new.current_participants);
          
          // If max participants is reached, update session_started flag
          if (payload.new.current_participants >= maxParticipants && maxParticipants > 0 && !payload.new.session_started) {
            console.log("Maximum participants reached, starting session automatically");
            // Update session_started flag
            supabase
              .from('conversations')
              .update({ session_started: true })
              .eq('id', conversationId)
              .then(({ error }) => {
                if (error) {
                  console.error("Error starting session automatically:", error);
                } else {
                  console.log("Session started automatically");
                }
              });
          }
        }
      })
      .subscribe();
    
    const eventsChannel = supabase
      .channel(`admin-session-events-${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'session_events',
        filter: `conversation_id=eq.${conversationId}`
      }, (payload) => {
        console.log("Admin received session event:", payload);
        
        if (payload.new && payload.new.event_type === 'participant_joined') {
          const eventData = payload.new.data;
          if (eventData && eventData.current_count !== undefined) {
            console.log("Updating admin participant count from event:", eventData.current_count);
            setDisplayCount(eventData.current_count);
          }
        }
      })
      .subscribe();
      
    return () => {
      removeChannel(conversationChannel);
      removeChannel(eventsChannel);
    };
  }, [conversationData, participants.length, currentParticipantCount, maxParticipants]);

  return (
    <div className="w-80 border-l border-gray-200 p-4 overflow-y-auto bg-gray-50 hidden md:block">
      <h3 className="font-medium mb-2 flex items-center gap-2">
        <Users className="h-4 w-4" /> 
        Participants ({displayCount}/{maxParticipants || "∞"})
      </h3>
      
      <div className="space-y-2">
        {isLoading ? (
          // Show loading skeletons when data is being loaded
          Array.from({ length: displayCount || 3 }).map((_, index) => (
            <div 
              key={`skeleton-${index}`}
              className="p-2 bg-white rounded border border-gray-100 flex items-center gap-2"
            >
              <Skeleton className="w-2 h-2 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-24 mb-1" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
          ))
        ) : participants.length > 0 ? (
          participants.map((participant) => (
            <div 
              key={participant.id}
              className="p-2 bg-white rounded border border-gray-100 flex items-center gap-2"
            >
              <div 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: ['#FCA5A5', '#FDBA74', '#BEF264'][participant.id % 3] }} 
              />
              <div className="flex-1">
                <div className="text-sm font-medium">{participant.name}</div>
                {participant.isAnonymous && (
                  <div className="text-xs text-gray-500">Anonymous mode</div>
                )}
              </div>
              <div className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                Active
              </div>
            </div>
          ))
        ) : (
          // Show no participants message
          <div className="text-center py-4 text-sm text-gray-500">
            No participants have joined yet.
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminParticipantList;
