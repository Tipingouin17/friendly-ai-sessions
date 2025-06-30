
import React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface SessionsDropdownProps {
  sessions: any[];
  currentConversationId: number | null;
}

const SessionsDropdown: React.FC<SessionsDropdownProps> = ({
  sessions,
  currentConversationId
}) => {
  const navigate = useNavigate();

  const handleSessionSwitch = (sessionId: number) => {
    if (sessionId !== currentConversationId) {
      navigate(`/session/host?id=${sessionId}`);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          Switch Session
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 bg-white z-50">
        <DropdownMenuLabel className="flex items-center justify-between">
          Active Sessions
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {sessions.length === 0 ? (
          <DropdownMenuItem disabled>
            No other active sessions
          </DropdownMenuItem>
        ) : (
          sessions
            .filter(session => session.id !== currentConversationId)
            .map((session) => (
              <DropdownMenuItem
                key={session.id}
                onClick={() => handleSessionSwitch(session.id)}
                className="cursor-pointer"
              >
                <div className="flex flex-col">
                  <span className="font-medium">
                    {session.sessions?.title || 'Untitled Session'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {session.current_participants || 0} participants
                  </span>
                </div>
              </DropdownMenuItem>
            ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default SessionsDropdown;
