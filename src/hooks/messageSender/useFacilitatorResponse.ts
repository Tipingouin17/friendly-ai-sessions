
import { supabase } from "@/integrations/supabase/client";
import { Message } from "@/types/chat";
import { nanoid } from "nanoid";
import { resolveFacilitatorAvatar } from "@/utils/avatarUtils";
import { useToast } from "@/components/ui/use-toast";

export const useFacilitatorResponse = () => {
  const { toast } = useToast();

  const requestFacilitatorResponse = async (
    conversationId: number,
    messages: Message[],
    conversation: any
  ): Promise<Message> => {
    console.log('Calling edge function for facilitator response');

    try {
      const response = await supabase.functions.invoke('handle-facilitator-response', {
        body: {
          messages,
          conversationId
        }
      });

      if (response.error) {
        console.error('Error from edge function:', response.error);
        throw new Error(response.error.message || 'Failed to get AI response');
      }
      
      if (!response.data) {
        console.error('No response data received from AI');
        throw new Error('No response data received from AI');
      }

      // Resolve the avatar URL using our utility
      const avatarUrl = await resolveFacilitatorAvatar(response.data, conversation);

      // Create AI response message
      const aiResponse: Message = {
        id: response.data.id || nanoid(),
        content: response.data.content,
        sender: "assistant",
        timestamp: new Date(),
        avatar: avatarUrl
      };
      
      console.log("Got AI response with avatar:", aiResponse.avatar);
      
      // Save AI response to database
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        content: {
          text: aiResponse.content,
          avatar: avatarUrl
        },
        role: 'assistant',
        user_id: null
      });
      
      console.log("AI response saved to database with avatar");
      
      return aiResponse;
    } catch (error) {
      console.error('Error getting AI response:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : "Failed to get facilitator's response. Please try again.";
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      throw error;
    }
  };

  return { requestFacilitatorResponse };
};
