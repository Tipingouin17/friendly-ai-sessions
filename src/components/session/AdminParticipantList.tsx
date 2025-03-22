
import React, { useEffect, useState } from 'react';
import { ParticipantInfo } from "@/types/chat";
import { Users, UserX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { removeChannel } from "@/utils/realtimeHelpers";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

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
  const [participantsList, setParticipantsList] = useState<ParticipantInfo[]>(participants);
  const { toast } = useToast();
  
  // Synchronize the component's local state with the incoming props
  useEffect(() => {
    if (participants && participants.length > 0) {
      setParticipantsList(participants);
    }
  }, [participants]);
  
  // Function to remove a participant
  const removeParticipant = async (participantId: number) => {
    if (!conversationData?.id) return;
    
    const conversationId = conversationData.id;
    
    try {
      // First, remove from session_participants table
      const { error: removeError } = await supabase
        .from('session_participants')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('participant_id', participantId);
        
      if (removeError) {
        console.error("Error removing participant:", removeError);
        toast({
          title: "Error",
          description: "Could not remove participant",
          variant: "destructive"
        });
        return;
      }
      
      // Update participant count in conversations table
      const newCount = Math.max(0, currentParticipantCount - 1);
      
      const { error: updateError } = await supabase
        .from('conversations')
        .update({ current_participants: newCount })
        .eq('id', conversationId);
        
      if (updateError) {
        console.error("Error updating participant count:", updateError);
        toast({
          title: "Error",
          description: "Could not update participant count",
          variant: "destructive"
        });
        return;
      }
      
      // Create a participant_removed event
      await supabase
        .from('session_events')
        .insert({
          conversation_id: conversationId,
          event_type: 'participant_removed',
          data: { 
            participant_id: participantId,
            current_count: newCount,
            removed_by: 'admin',
            timestamp: new Date().toISOString()
          }
        });
      
      // Update local state
      setDisplayCount(newCount);
      setParticipantsList(prev => prev.filter(p => p.id !== participantId));
      
      toast({
        title: "Participant removed",
        description: `Successfully removed participant ${participantId}`,
      });
    } catch (err) {
      console.error("Exception removing participant:", err);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    }
  };
  
  // Set up realtime subscription for participant updates
  useEffect(() => {
    if (!conversationData?.id) return;
    
    const conversationId = conversationData.id;
    
    // Use the higher number between actual participants array length and current_participants count
    setDisplayCount(Math.max(participants.length, currentParticipantCount));
    
    // Set up channel subscriptions
    const conversationChannel = supabase
      .channel(`admin-conversation-updates-${conversationId}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'conversations',
        filter: `id=eq.${conversationId}`
      }, (payload) => {
        if (payload.new && payload.new.current_participants !== undefined) {
          setDisplayCount(payload.new.current_participants);
          
          // If max participants is reached, update session_started flag
          if (payload.new.current_participants >= maxParticipants && maxParticipants > 0 && !payload.new.session_started) {
            // Update session_started flag
            supabase
              .from('conversations')
              .update({ session_started: true })
              .eq('id', conversationId)
              .then(({ error }) => {
                if (error) {
                  console.error("Error starting session automatically:", error);
                }
              });
          }
        }
      })
      .subscribe();
    
    // Listen for session events
    const eventsChannel = supabase
      .channel(`admin-session-events-${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'session_events',
        filter: `conversation_id=eq.${conversationId}`
      }, (payload) => {
        if (payload.new && payload.new.event_type === 'participant_joined') {
          const eventData = payload.new.data;
          if (eventData) {
            if (eventData.current_count !== undefined) {
              setDisplayCount(eventData.current_count);
            }
            
            // Update participant information from the event data
            if (eventData.participant_id && eventData.participant_name) {
              setParticipantsList(prev => {
                // Check if participant already exists
                const exists = prev.some(p => p.id === eventData.participant_id);
                if (exists) return prev;
                
                return [...prev, {
                  id: eventData.participant_id,
                  name: eventData.participant_name,
                  avatar: eventData.avatar_url || null,
                  isAnonymous: eventData.is_anonymous || false
                }];
              });
            }
          }
        } else if (payload.new && payload.new.event_type === 'participant_removed') {
          const eventData = payload.new.data;
          if (eventData && eventData.participant_id && eventData.current_count !== undefined) {
            setDisplayCount(eventData.current_count);
            
            // Remove participant from list if we didn't remove them ourselves
            if (eventData.removed_by !== 'admin') {
              setParticipantsList(prev => prev.filter(p => p.id !== eventData.participant_id));
            }
          }
        }
      })
      .subscribe();
      
    // Set up a direct subscription to session_participants table
    const participantsDirectChannel = supabase
      .channel(`admin-participants-direct-${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'session_participants',
        filter: `conversation_id=eq.${conversationId}`
      }, (payload) => {
        if (payload.new) {
          const participantData = payload.new;
          setParticipantsList(prev => {
            // Check if participant already exists
            const exists = prev.some(p => p.id === participantData.participant_id);
            if (exists) return prev;
            
            return [...prev, {
              id: participantData.participant_id,
              name: participantData.name,
              avatar: participantData.avatar_seed 
                ? `/api/avatar?name=${participantData.avatar_seed}&variant=beam&palette=0` 
                : null,
              isAnonymous: participantData.is_anonymous || false
            }];
          });
        }
      })
      .subscribe();
      
    return () => {
      removeChannel(conversationChannel);
      removeChannel(eventsChannel);
      removeChannel(participantsDirectChannel);
    };
  }, [conversationData, participants.length, currentParticipantCount, maxParticipants]);

  return (
    <div className="w-80 border-l border-gray-200 p-4 overflow-y-auto bg-white hidden md:block">
      <h3 className="flex items-center gap-2 font-medium mb-4 text-gray-900">
        <Users className="h-5 w-5" /> 
        Participants ({displayCount}/{maxParticipants || "∞"})
      </h3>
      
      {isLoading ? (
        // Loading skeletons
        Array.from({ length: displayCount || 3 }).map((_, index) => (
          <div 
            key={`skeleton-${index}`}
            className="p-3 mb-2 rounded-lg border border-gray-100 flex items-center gap-2"
          >
            <Skeleton className="w-2 h-2 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-4 w-24 mb-1" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
        ))
      ) : participantsList.length > 0 ? (
        <div className="space-y-2">
          {participantsList.map((participant) => (
            <div 
              key={participant.id}
              className="p-3 bg-white rounded-lg border border-gray-100 flex items-center gap-2 hover:border-gray-200 transition-colors group relative"
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
              
              {/* Modified layout to prevent overlap */}
              <div className="flex items-center gap-2">
                <div className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full whitespace-nowrap">
                  Active
                </div>
                
                {/* Remove participant button - visible on hover */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 p-0"
                  onClick={() => removeParticipant(participant.id)}
                  title="Remove participant"
                >
                  <UserX className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 px-4">
          <p className="text-gray-500 mb-2">No participants have joined yet.</p>
          <p className="text-sm text-gray-400">
            Share the session link or QR code to invite participants.
          </p>
        </div>
      )}
    </div>
  );
};

export default AdminParticipantList;
