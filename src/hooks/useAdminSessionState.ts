
import { useState, useCallback } from 'react';
import { Message, ParticipantInfo } from '@/types/chat';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface UseAdminSessionStateProps {
  conversationId: number | null;
  currentUserParticipantId: number | null;
  participants: ParticipantInfo[];
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

export function useAdminSessionState({
  conversationId,
  currentUserParticipantId,
  participants,
  messages,
  setMessages
}: UseAdminSessionStateProps) {
  const [isSessionPaused, setIsSessionPaused] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  // Toggle session state (active/paused)
  const toggleSessionState = useCallback(async () => {
    if (!conversationId) return;

    try {
      setIsSessionPaused(prevState => !prevState);
      
      // In a real implementation, we would update the database
      // to reflect the session state
      toast({
        title: isSessionPaused ? "Session resumed" : "Session paused",
        description: isSessionPaused 
          ? "Participants can now send messages" 
          : "Participants are restricted from sending new messages",
      });
      
      // Here we would update the session state in the database
      // For now, we'll just notify the admin and toggle the UI state
    } catch (error) {
      console.error("Error toggling session state:", error);
      toast({
        title: "Error",
        description: "Failed to update session state. Please try again.",
        variant: "destructive",
      });
    }
  }, [conversationId, isSessionPaused, toast]);

  // Send admin message to all participants or specific participant
  const sendAdminMessage = useCallback(async (message: string, isPinned: boolean = false, recipientId?: string) => {
    if (!conversationId) return;

    try {
      const newMessage: Message = {
        id: `admin-${Date.now()}`,
        content: message,
        sender: "assistant",
        timestamp: new Date(),
        isPinned,
        recipientId,
        isAdminMessage: true
      };

      // Add to local state to immediately show in the UI
      setMessages(prevMessages => [...prevMessages, newMessage]);
      
      // In a real implementation, send to database via Supabase
      if (conversationId) {
        // Format for database - make sure we're sending content as a JSON object
        const messageData = {
          conversation_id: conversationId,
          content: {
            message, // The actual message text
            isPinned, // Whether the message should be pinned
            recipientId // Who the message is for (if anyone specific)
          },
          role: 'admin'
        };
        
        // Send to database
        const { error } = await supabase
          .from('messages')
          .insert(messageData);
          
        if (error) {
          console.error("Error sending admin message to database:", error);
          toast({
            title: "Error",
            description: "Failed to save admin message to database.",
            variant: "destructive",
          });
        }
      }

      toast({
        title: "Message sent",
        description: recipientId 
          ? `Your message has been sent to the selected participant` 
          : `Your message has been sent to all participants`,
      });
    } catch (error) {
      console.error("Error sending admin message:", error);
      toast({
        title: "Error",
        description: "Failed to send admin message. Please try again.",
        variant: "destructive",
      });
    }
  }, [conversationId, setMessages, toast]);

  // Export session data (messages, participants, etc.)
  const exportSessionData = useCallback(async () => {
    if (!conversationId) return;

    try {
      setIsExporting(true);
      
      // Prepare the data to export
      // Filter out system messages and format for export
      const exportableMessages = messages
        .filter(m => !m.isReport && (m.sender === "user" || m.sender === "assistant" || m.isAdminMessage))
        .map(m => {
          // Find participant info for user messages
          const participantInfo = m.sender === "user" && m.participant 
            ? participants.find(p => `P${p.id}` === m.participant) 
            : null;
            
          return {
            timestamp: m.timestamp ? m.timestamp.toISOString() : new Date().toISOString(),
            type: m.isAdminMessage ? "admin" : m.sender,
            participant: participantInfo?.name || m.participant || "Unknown",
            anonymous: participantInfo?.isAnonymous || false,
            content: m.content,
            pinned: m.isPinned || false
          };
        });
      
      // Create export object
      const exportData = {
        sessionId: conversationId,
        title: "Session Export",
        exportDate: new Date().toISOString(),
        participants: participants.map(p => ({
          id: p.id,
          name: p.name,
          anonymous: p.isAnonymous || false
        })),
        messages: exportableMessages
      };
      
      // Convert to JSON
      const jsonString = JSON.stringify(exportData, null, 2);
      
      // Create and download file
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `session-${conversationId}-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Export complete",
        description: "Session data has been exported to a JSON file",
      });
    } catch (error) {
      console.error("Error exporting session data:", error);
      toast({
        title: "Export failed",
        description: "There was an error exporting the session data",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  }, [conversationId, messages, participants, toast]);

  return {
    isSessionPaused,
    isExporting,
    toggleSessionState,
    sendAdminMessage,
    exportSessionData
  };
}
