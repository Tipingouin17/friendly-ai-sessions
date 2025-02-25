
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ChatHeader from "@/components/chat/ChatHeader";
import MessageList from "@/components/chat/MessageList";
import ChatInput from "@/components/chat/ChatInput";
import { Message } from "@/types/chat";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";

const participantColors = {
  P1: "#FFB6C1", // Light pink for better visibility
  P2: "#FDBA74",
  P3: "#BEF264",
  P4: "#86EFAC",
  P5: "#6EE7B7",
  P6: "#5EEAD4",
  P7: "#67E8F9",
  P8: "#7DD3FC",
};

const Session = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentParticipant, setCurrentParticipant] = useState(1);
  const [inputMessage, setInputMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);

  const { data: conversation, isLoading } = useQuery({
    queryKey: ['conversation', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          sessions:sessions_id (
            id,
            title,
            objective,
            welcome_message,
            facilitator,
            facilitator:facilitators (
              id,
              title,
              profile_picture,
              details
            )
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (conversation?.sessions?.welcome_message) {
      setMessages([{
        id: 'welcome',
        content: conversation.sessions.welcome_message,
        sender: "assistant",
        timestamp: new Date(),
      }]);
    }
  }, [conversation]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      sender: "user",
      participant: `P${currentParticipant}`,
      timestamp: new Date(),
      color: participantColors[`P${currentParticipant}` as keyof typeof participantColors],
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      // Save message to database
      await supabase
        .from('messages')
        .insert({
          content: inputMessage,
          role: "user",
          name: `P${currentParticipant}`,
          conversation_id: Number(id),
          facilitator_id: conversation?.sessions?.facilitator?.id
        });

      // Get AI response
      const response = await supabase.functions.invoke('handle-facilitator-response', {
        body: {
          messages: [...messages, userMessage],
          conversationId: Number(id)
        }
      });

      if (response.error) throw new Error(response.error.message);

      // Add AI response
      const aiResponse: Message = {
        id: response.data.id,
        content: response.data.content,
        sender: "assistant",
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to get facilitator's response. Please try again.",
        variant: "destructive",
      });
    }

    setInputMessage("");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Loading session...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-6">
        {/* Session Info Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center gap-4">
            <img
              src={conversation?.sessions?.facilitator?.profile_picture || "/placeholder.svg"}
              alt="Facilitator"
              className="w-16 h-16 rounded-full"
            />
            <div>
              <h1 className="text-xl font-semibold">{conversation?.sessions?.facilitator?.title}</h1>
              <p className="text-gray-600">{conversation?.sessions?.title}</p>
              <p className="text-sm text-[#FFC107]">{conversation?.participants} participant{conversation?.participants !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>

        {/* Chat Section */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="h-[600px] overflow-y-auto p-6">
            <MessageList
              messages={messages}
              participantColors={participantColors}
            />
          </div>

          {/* Input Section */}
          <div className="border-t border-gray-100">
            <div className="p-4 flex justify-center gap-2">
              {Array.from({ length: conversation?.participants || 1 }, (_, i) => i + 1).map((num) => (
                <Button
                  key={num}
                  onClick={() => setCurrentParticipant(num)}
                  variant={currentParticipant === num ? "default" : "outline"}
                  className={currentParticipant === num ? "bg-[#FFC107] hover:bg-[#FFB000]" : ""}
                >
                  P{num}
                </Button>
              ))}
            </div>
            <ChatInput
              inputMessage={inputMessage}
              setInputMessage={setInputMessage}
              onSendMessage={handleSendMessage}
              isRecording={isRecording}
              setIsRecording={setIsRecording}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between mt-6">
          <Button variant="outline" onClick={() => {}}>Save</Button>
          <Button 
            className="bg-[#FFC107] hover:bg-[#FFB000] text-white"
            onClick={() => {}}
          >
            End Session
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Session;
