
import React, { useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Play, Users, X } from "lucide-react";

interface StartSessionButtonProps {
  onStartSession: () => void;
  participantCount: number;
  isSessionStarted: boolean;
  disabled?: boolean;
  isAutoStarting?: boolean;
  autoStartCountdown?: number;
  onCancelAutoStart?: () => void;
}

const StartSessionButton: React.FC<StartSessionButtonProps> = ({
  onStartSession,
  participantCount,
  isSessionStarted,
  disabled = false,
  isAutoStarting = false,
  autoStartCountdown = 0,
  onCancelAutoStart
}) => {
  const lastClickTime = useRef<number>(0);
  
  // Stable click handler with debouncing and debugging
  const handleClick = useCallback(() => {
    const now = Date.now();
    const timeSinceLastClick = now - lastClickTime.current;
    
    // If auto-starting, allow cancellation
    if (isAutoStarting && onCancelAutoStart) {
      onCancelAutoStart();
      return;
    }
    
    // Prevent rapid clicks (debounce)
    if (timeSinceLastClick < 1000) {
      return;
    }
    
    // Check if button should be enabled
    if (disabled || participantCount === 0 || isSessionStarted) {
      return;
    }
    
    lastClickTime.current = now;
    onStartSession();
  }, [onStartSession, participantCount, isSessionStarted, disabled, isAutoStarting, onCancelAutoStart]);

  // Log state changes for debugging
  React.useEffect(() => { /* no-op */ }, [participantCount, isSessionStarted, disabled, isAutoStarting, autoStartCountdown]);

  if (isSessionStarted) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
        <Users className="h-4 w-4 text-green-600" />
        <span className="text-green-800 font-medium">Session Active</span>
        <span className="text-green-600 text-sm">({participantCount} participants)</span>
      </div>
    );
  }

  if (isAutoStarting) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600"></div>
          <span className="text-orange-800 font-medium">
            Auto-starting in {autoStartCountdown}s...
          </span>
          <span className="text-orange-600 text-sm">({participantCount} participants)</span>
        </div>
        {onCancelAutoStart && (
          <Button
            onClick={handleClick}
            variant="outline"
            size="sm"
            className="flex items-center gap-1 text-gray-600 hover:text-red-600 hover:border-red-300"
          >
            <X className="h-3 w-3" />
            Cancel
          </Button>
        )}
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
