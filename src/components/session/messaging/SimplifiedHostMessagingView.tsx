import React, { useState, useCallback } from "react";
import { Message, ParticipantInfo } from "@/types/chat";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import WelcomeMessageDebugPanel from './WelcomeMessageDebugPanel';

interface SimplifiedHostMessagingViewProps {
  messages: Message[];
  participantColors: { [key: string]: string };
  currentParticipantCount: number;
  conversationData?: any;
  isWaitingForResponses?: boolean;
  responseCount?: number;
  totalParticipants?: number;
  onTriggerFacilitatorResponse?: () => void;
  isSessionStarted?: boolean;
  onSessionStarted?: () => void;
  participants?: ParticipantInfo[];
  conversationId?: number | null;
  isAutoStarting?: boolean;
  autoStartCountdown?: number;
  onCancelAutoStart?: () => void;
}

const SimplifiedHostMessagingView: React.FC<SimplifiedHostMessagingViewProps> = ({
  messages,
  participantColors,
  currentParticipantCount,
  conversationData,
  isWaitingForResponses = false,
  responseCount = 0,
  totalParticipants = 1,
  onTriggerFacilitatorResponse,
  isSessionStarted = false,
  onSessionStarted,
  participants = [],
  conversationId,
  isAutoStarting = false,
  autoStartCountdown = 0,
  onCancelAutoStart
}) => {
  const [inputMessage, setInputMessage] = useState("");
  const [isRegeneratingWelcome, setIsRegeneratingWelcome] = useState(false);
  
  // Enhanced message handling with welcome message regeneration
  const handleRegenerateWelcome = useCallback(async () => {
    if (!conversationId) return;
    
    setIsRegeneratingWelcome(true);
    try {
      // Clear existing welcome message cache
      const storageKey = `session_welcome_message_${conversationId}`;
      localStorage.removeItem(storageKey);
      
      // Trigger welcome message regeneration by reloading the page
      // This will cause the welcome message hook to regenerate it
      window.location.reload();
    } catch (error) {
      console.error('Error regenerating welcome message:', error);
    } finally {
      setIsRegeneratingWelcome(false);
    }
  }, [conversationId]);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Enhanced: Welcome Message Debug Panel for Admins */}
      <WelcomeMessageDebugPanel
        conversation={conversationData}
        welcomeMessage={conversationData?.sessions?.welcome_message}
        isAdmin={true}
        onRegenerateWelcome={handleRegenerateWelcome}
        isGenerating={isRegeneratingWelcome}
      />

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Host Messaging View</h2>
        {isAutoStarting && (
          <div className="text-sm text-blue-600">
            Auto-starting in {autoStartCountdown} seconds...
            <Button variant="ghost" size="sm" onClick={onCancelAutoStart} className="ml-2">
              Cancel
            </Button>
          </div>
        )}
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "p-3 rounded-md",
              msg.sender === "assistant" ? "bg-blue-50 text-blue-900" : "bg-gray-100 text-gray-900"
            )}
          >
            <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
            {msg.isWelcomeMessage && (
              <div className="mt-1 text-xs text-gray-500 italic">[Welcome Message]</div>
            )}
          </div>
        ))}
      </div>

      {/* Footer with regenerate welcome button and trigger facilitator response */}
      <div className="p-4 border-t border-gray-200 flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={handleRegenerateWelcome}
          disabled={isRegeneratingWelcome}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRegeneratingWelcome ? "animate-spin" : ""}`} />
          {isRegeneratingWelcome ? "Regenerating..." : "Regenerate Welcome"}
        </Button>

        <Button
          variant="primary"
          size="sm"
          onClick={onTriggerFacilitatorResponse}
          disabled={isWaitingForResponses || responseCount === 0}
        >
          Trigger Facilitator Response ({responseCount})
        </Button>
      </div>
    </div>
  );
};

export default SimplifiedHostMessagingView;
