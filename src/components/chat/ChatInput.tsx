
import React, { useRef, useEffect, useState } from 'react';
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
  isRecording = false,
  setIsRecording = () => { /* no-op */ },
  placeholder = "Type your message...",
  disabled = false,
  isMobile = false
}: ChatInputProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  // Track the text that existed before recording started so we can append the transcript to it
  const preRecordingTextRef = useRef<string>('');
  const [speechSupported, setSpeechSupported] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognitionAPI) {
        setSpeechSupported(true);
        recognitionRef.current = new SpeechRecognitionAPI();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onresult = (event) => {
          // Build the full transcript from all results
          const transcript = Array.from(event.results)
            .map(result => result[0].transcript)
            .join('');
          // Append the live transcript to whatever text existed before recording started
          const combined = preRecordingTextRef.current
            ? preRecordingTextRef.current.trimEnd() + ' ' + transcript
            : transcript;
          setInputMessage(combined);
        };

        recognitionRef.current.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          setIsRecording(false);
          if (event.error === 'not-allowed') {
            toast({
              title: "Microphone Access Denied",
              description: "Please allow microphone access in your browser settings to use voice input.",
              variant: "destructive",
            });
          } else if (event.error === 'no-speech') {
            toast({
              title: "No Speech Detected",
              description: "No speech was detected. Please try again.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Voice Input Error",
              description: "There was an error with voice input. Please try again.",
              variant: "destructive",
            });
          }
        };

        recognitionRef.current.onend = () => {
          // Auto-stop recording state when recognition ends
          setIsRecording(false);
        };
      } else {
        setSpeechSupported(false);
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [setInputMessage, setIsRecording]);

  const handleStartRecording = () => {
    if (!speechSupported) {
      toast({
        title: "Voice Input Not Supported",
        description: "Your browser doesn't support voice input. Try Chrome or Edge.",
        variant: "destructive",
      });
      return;
    }
    if (recognitionRef.current) {
      // Save current text so we can append the transcript to it
      preRecordingTextRef.current = inputMessage;
      try {
        recognitionRef.current.start();
        setIsRecording(true);
        toast({
          title: "Listening...",
          description: "Speak now. Click the stop button when done.",
        });
      } catch (err) {
        console.error('Failed to start speech recognition:', err);
        toast({
          title: "Could Not Start Voice Input",
          description: "Please check your microphone permissions and try again.",
          variant: "destructive",
        });
      }
    }
  };

  const handleStopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
  };

  const handleSendClick = () => {
    if (!inputMessage.trim() || disabled) {
      return;
    }
    // Stop recording if active before sending
    if (isRecording) {
      handleStopRecording();
    }
    onSendMessage();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !disabled) {
      e.preventDefault();
      handleSendClick();
    }
  };

  return (
    <div className={`${isMobile ? 'p-3' : 'p-4'} border-t border-gray-200 bg-white`}>
      <div className="relative flex items-center">
        <Textarea
          ref={textareaRef}
          value={inputMessage}
          onChange={(e) => {
            setInputMessage(e.target.value);
          }}
          placeholder={disabled ? "You have already answered this question" : placeholder}
          className={`${isMobile ? 'min-h-[45px] py-2 text-sm' : 'min-h-[60px]'} pr-16 rounded-md border-gray-200 resize-none`}
          disabled={disabled}
          onKeyDown={handleKeyDown}
        />
        <div className="absolute right-2 flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={isRecording ? handleStopRecording : handleStartRecording}
            className={`${isMobile ? 'h-7 w-7' : 'h-8 w-8'} ${
              isRecording
                ? "text-red-600 animate-pulse"
                : speechSupported === false
                  ? "text-gray-300 cursor-not-allowed"
                  : "text-gray-500 hover:text-indigo-600"
            }`}
            disabled={disabled}
            title={
              isRecording
                ? "Stop recording"
                : speechSupported === false
                  ? "Voice input not supported in this browser"
                  : "Start voice input"
            }
          >
            {isRecording ? (
              <StopCircle className={`${isMobile ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} />
            ) : (
              <Mic className={`${isMobile ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} />
            )}
          </Button>
          <Button
            onClick={handleSendClick}
            size="icon"
            className={`${isMobile ? 'h-7 w-7' : 'h-8 w-8'} bg-indigo-600 hover:bg-indigo-700`}
            disabled={!inputMessage.trim() || disabled}
          >
            <Send className={`${isMobile ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} />
          </Button>
        </div>
      </div>
      {isRecording && (
        <div className="mt-1 flex items-center gap-1.5 text-xs text-red-600">
          <span className="inline-block h-2 w-2 rounded-full bg-red-600 animate-pulse" />
          <span>Listening… speak now, then click stop or press Enter to send.</span>
        </div>
      )}
    </div>
  );
};

export default ChatInput;
