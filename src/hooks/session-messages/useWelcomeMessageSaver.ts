
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
    if (!isAdmin || !conversationId) return;
    
    debugLog('all', 'Admin: Adding welcome message to database for other clients');
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          content: { 
            text: welcomeMsg.content,
            avatar: welcomeMsg.avatar
          },
          role: 'assistant',
          created_at: new Date().toISOString()
        });
        
      if (error) {
        console.error('Error saving welcome message to database:', error);
      }
    } catch (err) {
      console.error('Exception saving welcome message:', err);
    }
  }, [conversationId, isAdmin]);

  return { saveWelcomeMessageToDb };
};
