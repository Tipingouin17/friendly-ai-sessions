
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
    console.log('💾 saveWelcomeMessageToDb called:', {
      isAdmin,
      conversationId,
      messageId: welcomeMsg.id,
      contentLength: welcomeMsg.content?.length,
      hasAvatar: !!welcomeMsg.avatar,
      conversationIdType: typeof conversationId,
      conversationIdValid: conversationId !== null && conversationId !== undefined && !isNaN(conversationId)
    });

    // Enhanced validation - check for valid conversation ID
    if (!conversationId || isNaN(conversationId)) {
      console.log('⚠️ Skipping database save - invalid conversation ID:', conversationId);
      return;
    }

    if (!isAdmin) {
      console.log('⚠️ Skipping database save - not admin/host');
      return;
    }
    
    debugLog('all', 'Admin: Adding welcome message to database for other clients');
    
    const messageContent = {
      text: welcomeMsg.content,
      avatar: welcomeMsg.avatar
    };

    console.log('📝 Preparing message for database:', {
      conversationId,
      messageContent,
      role: 'assistant'
    });

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
        
      console.log('💾 Database insert result:', {
        success: !error,
        error: error?.message,
        insertedData: data
      });
        
      if (error) {
        console.error('❌ Error saving welcome message to database:', error);
      } else {
        console.log('✅ Welcome message saved to database successfully');
      }
    } catch (err) {
      console.error('💥 Exception saving welcome message:', err);
    }
  }, [conversationId, isAdmin]);

  return { saveWelcomeMessageToDb };
};
