
import { useState, useCallback, useEffect } from 'react';
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

export const useAdminSessionState = ({
  conversationId,
  currentUserParticipantId,
  participants,
  messages,
  setMessages
}: UseAdminSessionStateProps) => {
  const [isSessionPaused, setIsSessionPaused] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  // Toggle session paused state
  const toggleSessionState = useCallback(async () => {
    if (!conversationId) return;
    
    try {
      setIsSessionPaused(prev => !prev);
      
      // Here you would typically update the database to reflect the session state
      // For this implementation, we're just showing a toast notification
      toast({
        title: isSessionPaused ? "Session resumed" : "Session paused",
        description: isSessionPaused 
          ? "Participants can now submit responses" 
          : "Participants cannot submit new responses"
      });
      
      // In a real implementation, you would update the database
      // await supabase
      //   .from('conversations')
      //   .update({ is_paused: !isSessionPaused })
      //   .eq('id', conversationId);
      
    } catch (error) {
      console.error('Error toggling session state:', error);
      toast({
        title: "Error",
        description: "Failed to update session state",
        variant: "destructive"
      });
    }
  }, [conversationId, isSessionPaused, toast]);

  // Send admin message
  const sendAdminMessage = useCallback(async (
    content: string, 
    isPinned: boolean = false,
    recipientId?: string
  ) => {
    if (!conversationId || !content.trim()) return;
    
    try {
      // Create a unique ID for the message
      const messageId = `admin-${Date.now()}`;
      
      // Create the admin message object
      const adminMessage: Message = {
        id: messageId,
        content,
        sender: "assistant",
        timestamp: new Date(),
        isPinned,
        recipientId,
        isAdminMessage: true
      };
      
      // Add the message to the local state first for immediate feedback
      setMessages(prev => [...prev, adminMessage]);
      
      // In a real implementation, you would save to the database
      // Since the database schema might be different from our Message type,
      // we need to adapt the data structure
      const { error } = await supabase
        .from('messages')
        .insert({
          content,
          conversation_id: conversationId,
          role: 'assistant',
          // Using custom metadata to store additional fields
          name: JSON.stringify({
            is_pinned: isPinned,
            recipient_id: recipientId,
            is_admin_message: true
          })
        });
      
      if (error) {
        throw new Error(error.message);
      }
      
      toast({
        title: "Message sent",
        description: recipientId 
          ? "Your message has been sent to the selected participant" 
          : "Your message has been sent to all participants"
      });
      
    } catch (error) {
      console.error('Error sending admin message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    }
  }, [conversationId, setMessages, toast]);

  // Export session data
  const exportSessionData = useCallback(async () => {
    if (!conversationId || !messages.length) {
      toast({
        title: "Nothing to export",
        description: "There are no messages to export yet",
      });
      return;
    }
    
    try {
      setIsExporting(true);
      
      // Format data for export
      const questions = messages
        .filter(m => m.sender === "assistant" && !m.isReport && !m.isAdminMessage)
        .map(m => ({ id: m.id, content: m.content }));
      
      const exportData = {
        sessionId: conversationId,
        sessionTitle: "Session Export", // You'd get this from your context
        exportTime: new Date().toISOString(),
        questions: questions.map(q => {
          // Get all responses for this question
          const responses = messages
            .filter(m => m.sender === "user")
            .map(m => ({
              participant: participants.find(p => `P${p.id}` === m.participant)?.name || m.participant || "Unknown",
              content: m.content,
              timestamp: m.timestamp,
              isAnonymous: m.isAnonymous
            }));
          
          return {
            question: q.content,
            responses
          };
        })
      };
      
      // Convert to JSON and create download
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `session-export-${conversationId}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      
      toast({
        title: "Export complete",
        description: "Session data has been exported successfully"
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      toast({
        title: "Export failed",
        description: "There was an error exporting the session data",
        variant: "destructive"
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
};
