
import React, { useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Play, Users, Loader } from "lucide-react";

interface StartSessionButtonProps {
  onStartSession: () => void;
  participantCount: number;
  isSessionStarted: boolean;
  disabled?: boolean;
  isStartingSession?: boolean;
  startProgress?: string;
}

const StartSessionButton: React.FC<StartSessionButtonProps> = ({
  onStartSession,
  participantCount,
  isSessionStarted,
  disabled = false,
  isStartingSession = false,
  startProgress = ""
}) => {
  const lastClickTime = useRef<number>(0);
  
  // Stable click handler with debouncing and debugging
  const handleClick = useCallback(() => {
    const now = Date.now();
    const timeSinceLastClick = now - lastClickTime.current;
    
    console.log("🔥 StartSessionButton - Click detected!", {
      participantCount,
      isSessionStarted,
      disabled,
      isStartingSession,
      timeSinceLastClick,
      isEnabled: !disabled && participantCount > 0 && !isSessionStarted && !isStartingSession
    });
    
    // Prevent rapid clicks (debounce)
    if (timeSinceLastClick < 1000) {
      console.log("🔥 StartSessionButton - Click ignored (too fast)");
      return;
    }
    
    // Check if button should be enabled
    if (disabled || participantCount === 0 || isSessionStarted || isStartingSession) {
      console.log("🔥 StartSessionButton - Click ignored (button disabled)", {
        disabled,
        participantCount,
        isSessionStarted,
        isStartingSession
      });
      return;
    }
    
    lastClickTime.current = now;
    console.log("🔥 StartSessionButton - Executing onStartSession");
    onStartSession();
  }, [onStartSession, participantCount, isSessionStarted, disabled, isStartingSession]);

  // Log state changes for debugging
  React.useEffect(() => {
    console.log("🔥 StartSessionButton - State changed:", {
      participantCount,
      isSessionStarted,
      disabled,
      isStartingSession,
      startProgress,
      shouldBeEnabled: !disabled && participantCount > 0 && !isSessionStarted && !isStartingSession
    });
  }, [participantCount, isSessionStarted, disabled, isStartingSession, startProgress]);

  if (isSessionStarted) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
        <Users className="h-4 w-4 text-green-600" />
        <span className="text-green-800 font-medium">Session Active</span>
        <span className="text-green-600 text-sm">({participantCount} participants)</span>
      </div>
    );
  }

  if (isStartingSession) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg min-w-[140px]">
        <Loader className="h-4 w-4 text-blue-600 animate-spin" />
        <div className="flex flex-col">
          <span className="text-blue-800 font-medium text-sm">Starting Session</span>
          {startProgress && (
            <span className="text-blue-600 text-xs">{startProgress}</span>
          )}
        </div>
      </div>
    );
  }

  const isButtonDisabled = disabled || participantCount === 0;

  return (
    <Button
      onClick={handleClick}
      disabled={isButtonDisabled}
      className="flex items-center gap-2 min-w-[140px]"
      size="lg"
      style={{ pointerEvents: 'auto' }}
    >
      <Play className="h-4 w-4" />
      Start Session
    </Button>
  );
};

export default StartSessionButton;
