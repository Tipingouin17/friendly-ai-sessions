
import React, { useRef, useEffect } from 'react';
import { Mic, Send, StopCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { SpeechRecognition } from "@/types/chat";

interface ChatInputProps {
  inputMessage: string;
  setInputMessage: (message: string) => void;
  onSendMessage: () => void;
  isRecording?: boolean;
  setIsRecording?: (isRecording: boolean) => void;
  placeholder?: string;
  disabled?: boolean;
  isMobile?: boolean;
}

const ChatInput = ({
  inputMessage,
  setInputMessage,
  onSendMessage,
  isRecording,
  setIsRecording,
  placeholder = "Type your message here...",
  disabled = false,
  isMobile = false
}: ChatInputProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;

        recognitionRef.current.onresult = (event) => {
          const transcript = Array.from(event.results)
            .map(result => result[0].transcript)
            .join('');
          setInputMessage(transcript);
        };

        recognitionRef.current.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          setIsRecording(false);
          toast({
            title: "Error",
            description: "There was an error with speech recognition. Please try again.",
            variant: "destructive",
          });
        };
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [setInputMessage, setIsRecording]);

  const handleStartRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.start();
      setIsRecording(true);
      toast({
        title: "Recording started",
        description: "Your voice is being recorded...",
      });
    } else {
      toast({
        title: "Speech Recognition Not Available",
        description: "Your browser doesn't support speech recognition.",
        variant: "destructive",
      });
    }
  };

  const handleStopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
    toast({
      title: "Recording stopped",
      description: "Processing your message...",
    });
  };

  return (
    <div className={`${isMobile ? 'p-2' : 'p-4'} border-t border-gray-100`}>
      <div className="relative flex items-center">
        <Textarea
          ref={textareaRef}
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder={disabled ? "You have already answered this question" : placeholder}
          className={`${isMobile ? 'min-h-[45px] py-2 text-sm' : 'min-h-[60px]'} pr-16 rounded-md border-gray-200`}
          disabled={disabled}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !disabled) {
              e.preventDefault();
              onSendMessage();
            }
          }}
        />
        <div className="absolute right-2 flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={isRecording ? handleStopRecording : handleStartRecording}
            className={`${isMobile ? 'h-7 w-7' : 'h-8 w-8'} ${isRecording ? "text-red-600" : "text-gray-500 hover:text-gray-700"}`}
            disabled={disabled}
          >
            {isRecording ? (
              <StopCircle className={`${isMobile ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} />
            ) : (
              <Mic className={`${isMobile ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} />
            )}
          </Button>
          <Button
            onClick={onSendMessage}
            size="icon"
            className={`${isMobile ? 'h-7 w-7' : 'h-8 w-8'} bg-amber-500 hover:bg-amber-600`}
            disabled={!inputMessage.trim() || disabled}
          >
            <Send className={`${isMobile ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatInput;
