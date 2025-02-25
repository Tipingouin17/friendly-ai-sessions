
import { useState, useRef } from "react";
import { Mic, Send, StopCircle, Eraser } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";

interface Message {
  id: string;
  content: string;
  sender: "user" | "assistant";
  timestamp: Date;
}

const Session = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: "Welcome to Unity Quest!! How may I address you?",
      sender: "assistant",
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isDictating, setIsDictating] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  const handleStartRecording = () => {
    setIsRecording(true);
    toast({
      title: "Recording started",
      description: "Your voice is being recorded...",
    });
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    toast({
      title: "Recording stopped",
      description: "Processing your message...",
    });
  };

  const handleStartDictation = () => {
    setIsDictating(true);
    toast({
      title: "Voice dictation started",
      description: "Start speaking...",
    });
  };

  const handleStopDictation = () => {
    setIsDictating(false);
  };

  const handleClearChat = () => {
    setMessages([messages[0]]);
    toast({
      title: "Chat cleared",
      description: "All messages have been cleared except the welcome message.",
    });
  };

  return (
    <div className="min-h-screen pt-16 bg-[#FFC107]/10">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
          {/* Session Header */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-4">
              <img
                src="/lovable-uploads/fd3ef4cf-16d2-4ba3-8378-899a48eec819.png"
                alt="AI Facilitator"
                className="w-12 h-12 rounded-full"
              />
              <div>
                <h2 className="text-xl font-semibold">Serious Game Master</h2>
                <p className="text-sm text-muted-foreground">Mission Cohesion: Team Dynamics</p>
              </div>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="h-[calc(100vh-400px)] overflow-y-auto p-6 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.sender === "assistant" ? "justify-start" : "justify-end"
                }`}
              >
                <div
                  className={`max-w-[80%] p-4 rounded-2xl ${
                    message.sender === "assistant"
                      ? "bg-accent text-accent-foreground"
                      : "bg-primary text-primary-foreground"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
          </div>

          {/* Input Area */}
          <div className="p-6 border-t border-gray-100">
            <div className="flex gap-4 mb-4">
              <Button
                variant="outline"
                size="icon"
                onClick={isRecording ? handleStopRecording : handleStartRecording}
                className={isRecording ? "bg-red-50 text-red-600" : ""}
              >
                {isRecording ? <StopCircle /> : <Mic />}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={isDictating ? handleStopDictation : handleStartDictation}
                className={isDictating ? "bg-primary/10 text-primary" : ""}
              >
                {isDictating ? <StopCircle /> : <Mic />}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleClearChat}
              >
                <Eraser />
              </Button>
            </div>
            <div className="flex gap-4">
              <Textarea
                ref={textareaRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Type your message here..."
                className="min-h-[80px]"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <Button
                onClick={handleSendMessage}
                className="self-end"
                disabled={!inputMessage.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Session;
