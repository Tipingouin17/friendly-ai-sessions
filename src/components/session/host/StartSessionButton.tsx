
import React from "react";
import { Button } from "@/components/ui/button";
import { Play, Users } from "lucide-react";

interface StartSessionButtonProps {
  onStartSession: () => void;
  participantCount: number;
  isSessionStarted: boolean;
  disabled?: boolean;
}

const StartSessionButton: React.FC<StartSessionButtonProps> = ({
  onStartSession,
  participantCount,
  isSessionStarted,
  disabled = false
}) => {
  if (isSessionStarted) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
        <Users className="h-4 w-4 text-green-600" />
        <span className="text-green-800 font-medium">Session Active</span>
        <span className="text-green-600 text-sm">({participantCount} participants)</span>
      </div>
    );
  }

  return (
    <Button
      onClick={onStartSession}
      disabled={disabled || participantCount === 0}
      className="flex items-center gap-2"
      size="lg"
    >
      <Play className="h-4 w-4" />
      Start Session
      {participantCount > 0 && (
        <span className="ml-1">({participantCount} participants)</span>
      )}
    </Button>
  );
};

export default StartSessionButton;
