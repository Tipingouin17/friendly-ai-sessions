
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import ChatHeader from "@/components/chat/ChatHeader";
import MessageList from "@/components/chat/MessageList";
import ChatInput from "@/components/chat/ChatInput";
import { Message } from "@/types/chat";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

// Define participant colors for visual distinction
const participantColors = {
  P1: "#FCA5A5", P2: "#FDBA74", P3: "#BEF264", P4: "#86EFAC",
  P5: "#6EE7B7", P6: "#5EEAD4", P7: "#67E8F9", P8: "#7DD3FC",
  // ... add more colors as needed
};

const fetchConversation = async (id: number) => {
  const { data, error } = await supabase
    .from('conversations')
    .select(`
      *,
      sessions:sessions_id (
        title,
        objective,
        welcome_message,
        facilitator:facilitators (
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
};

const Session = () => {
  const { id } = useParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentParticipant, setCurrentParticipant] = useState(1);
  const [inputMessage, setInputMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [participantMessages, setParticipantMessages] = useState<{[key: string]: string}>({});

  const { data: conversation, isLoading } = useQuery({
    queryKey: ['conversation', id],
    queryFn: () => fetchConversation(Number(id)),
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
    }
  }, [conversation]);

  const handleParticipantSwitch = (participantNumber: number) => {
    setCurrentParticipant(participantNumber);
    setInputMessage(participantMessages[`P${participantNumber}`] || "");
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    // Save the current participant's message
    const currentParticipantKey = `P${currentParticipant}`;
    setParticipantMessages(prev => ({
      ...prev,
      [currentParticipantKey]: inputMessage
    }));

    // Check if all participants have provided input
    const updatedMessages = {
      ...participantMessages,
      [currentParticipantKey]: inputMessage
    };
    const totalParticipants = conversation?.participants || 1;
    const allParticipantsResponded = Object.keys(updatedMessages).length === totalParticipants;

    if (allParticipantsResponded) {
      // Create messages for all participants
      const participantResponses = Object.entries(updatedMessages).map(([participant, content], index) => ({
        id: Date.now().toString() + index,
        content,
        sender: "user",
        participant,
        timestamp: new Date(),
        color: participantColors[participant as keyof typeof participantColors]
      }));

      // Add all participant messages
      setMessages(prev => [...prev, ...participantResponses]);

      // Add facilitator response
      setTimeout(() => {
        const aiResponse: Message = {
          id: Date.now().toString(),
          content: "Thank you for your inputs. Let me analyze your responses and provide guidance.",
          sender: "assistant",
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, aiResponse]);
      }, 1000);

      // Clear all participant messages
      setParticipantMessages({});
    } else {
      // Move to next participant
      const nextParticipant = currentParticipant < totalParticipants ? currentParticipant + 1 : 1;
      setCurrentParticipant(nextParticipant);
    }

    setInputMessage("");
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

  const totalParticipants = conversation?.participants || 1;

  return (
    <div className="min-h-screen pt-16 bg-[#FFC107]/10">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
          <ChatHeader 
            title={conversation?.sessions?.facilitator?.title}
            objective={conversation?.sessions?.objective}
            profilePicture={conversation?.sessions?.facilitator?.profile_picture}
            participantCount={totalParticipants}
          />
          <MessageList 
            messages={messages} 
            participantColors={participantColors}
          />
          <div className="flex items-center justify-center gap-2 p-2 border-t">
            {Array.from({ length: totalParticipants }, (_, i) => i + 1).map((num) => (
              <button
                key={num}
                onClick={() => handleParticipantSwitch(num)}
                className={`px-3 py-1 rounded ${
                  currentParticipant === num 
                    ? 'bg-primary text-white' 
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                P{num}
              </button>
            ))}
          </div>
          <ChatInput
            inputMessage={inputMessage}
            setInputMessage={setInputMessage}
            onSendMessage={handleSendMessage}
            isRecording={isRecording}
            setIsRecording={setIsRecording}
            currentParticipant={currentParticipant}
          />
        </div>
      </div>
    </div>
  );
};

export default Session;
