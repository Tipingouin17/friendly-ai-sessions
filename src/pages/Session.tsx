
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import ChatHeader from "@/components/chat/ChatHeader";
import MessageList from "@/components/chat/MessageList";
import ChatInput from "@/components/chat/ChatInput";
import { Message } from "@/types/chat";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const fetchConversation = async (id: string) => {
  const { data, error } = await supabase
    .from('conversations')
    .select(`
      *,
      sessions:sessions_id (
        title,
        objective,
        welcome_message
      )
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
};

const Session = () => {
  const { id } = useParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);

  const { data: conversation, isLoading } = useQuery({
    queryKey: ['conversation', id],
    queryFn: () => fetchConversation(id!),
    enabled: !!id
  });

  useEffect(() => {
    if (conversation?.sessions?.welcome_message) {
      setMessages([
        {
          id: "1",
          content: conversation.sessions.welcome_message,
          sender: "assistant",
          timestamp: new Date(),
        },
      ]);
    } else {
      setMessages([
        {
          id: "1",
          content: "Welcome to Unity Quest!! How may I address you?",
          sender: "assistant",
          timestamp: new Date(),
        },
      ]);
    }
  }, [conversation]);

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputMessage("");

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: "I understand. Please tell me more about your thoughts on this.",
        sender: "assistant",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiResponse]);
    }, 1000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen pt-16 bg-[#FFC107]/10">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white rounded-3xl shadow-lg p-8">
            Loading...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-16 bg-[#FFC107]/10">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
          <ChatHeader title={conversation?.sessions?.title} objective={conversation?.sessions?.objective} />
          <MessageList messages={messages} />
          <ChatInput
            inputMessage={inputMessage}
            setInputMessage={setInputMessage}
            onSendMessage={handleSendMessage}
            isRecording={isRecording}
            setIsRecording={setIsRecording}
          />
        </div>
      </div>
    </div>
  );
};

export default Session;
