/**
 * use Welcome Message Saver
 *
 * Session message hook for the AIfacilitator application.
 */

import { useCallback } from 'react';
import { Message } from '@/types/chat';
import { supabase } from '@/integrations/supabase/client';
import { debugLog } from '@/utils/debugLogger';

interface UseWelcomeMessageSaverProps {
  conversationId: number | null;
  isAdmin: boolean;
}

export const useWelcomeMessageSaver = ({
  conversationId,
  isAdmin
}: UseWelcomeMessageSaverProps) => {
  // Save a welcome message to the database (admin only)
  const saveWelcomeMessageToDb = useCallback(async (welcomeMsg: Message) => {

    // Enhanced validation - check for valid conversation ID
    if (!conversationId || isNaN(conversationId)) {
      return;
    }

    if (!isAdmin) {
      return;
    }
    
    debugLog('all', 'Admin: Adding welcome message to database for other clients');
    
    const messageContent = {
      text: welcomeMsg.content,
      avatar: welcomeMsg.avatar
    };

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          content: messageContent,
          role: 'assistant',
          created_at: new Date().toISOString()
        })
        .select();
        
      if (error) {
        console.error('Error saving welcome message to database:', error);
      } else { /* no-op */ }
    } catch (err) {
      console.error('Exception saving welcome message:', err);
    }
  }, [conversationId, isAdmin]);

  return { saveWelcomeMessageToDb };
};
