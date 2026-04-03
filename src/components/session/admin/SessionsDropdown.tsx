/**
 * Sessions Dropdown
 *
 * Session component for the AIfacilitator application.
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ConversationWithSession } from "@/types/database";
import { Check, ChevronDown, ListFilter, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useSessionAdminStatus } from "@/hooks/useSessionAdminStatus";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SessionsDropdownProps {
  currentSessionId: number | null;
  activeSessions: ConversationWithSession[];
  isLoading: boolean;
  onRefresh: () => void;
}

const SessionsDropdown: React.FC<SessionsDropdownProps> = ({
  currentSessionId,
  activeSessions,
  isLoading,
  onRefresh
}) => {
  const navigate = useNavigate();
  const { setAdminStatus } = useSessionAdminStatus();
  const [open, setOpen] = useState(false);
  
  // Switch to another session
  const handleSelectSession = (session: ConversationWithSession) => {
    if (session.id === currentSessionId) return;
    
    // Set admin status and navigate
    sessionStorage.setItem('isAdminSession', 'true');
    setAdminStatus(true);
    
    navigate(`/session/admin?id=${session.id}`, {
      state: {
        isAdmin: true,
        showMessaging: true,
        conversationId: session.id
      }
    });
    
    setOpen(false);
  };
  
  // Format session title for display
  const formatSessionTitle = (session: ConversationWithSession) => {
    const sessionTitle = session.sessions?.title || "Untitled Session";
    return sessionTitle.length > 30 ? `${sessionTitle.substring(0, 30)}...` : sessionTitle;
  };
  
  // Get participant count text
  const getParticipantText = (session: ConversationWithSession) => {
    const current = session.current_participants || 0;
    const max = session.participants || 0;
    return `${current}/${max} participants`;
  };
  
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="flex items-center gap-2 text-sm text-gray-700"
        >
          <ListFilter size={16} className="text-gray-500" />
          Active Sessions ({activeSessions.length})
          <ChevronDown size={16} className="ml-1 text-gray-500" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-72 bg-white" align="end">
        <div className="flex items-center justify-between p-2">
          <DropdownMenuLabel className="text-sm font-medium">
            Active Sessions
          </DropdownMenuLabel>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onRefresh();
                  }}
                  disabled={isLoading}
                >
                  <RefreshCw size={14} className={`${isLoading ? 'animate-spin' : ''}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh sessions list</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <DropdownMenuSeparator />
        
        {isLoading ? (
          <div className="p-4 text-center text-sm text-gray-500">
            Loading sessions...
          </div>
        ) : activeSessions.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-500">
            No active sessions found
          </div>
        ) : (
          <div className="max-h-[300px] overflow-auto">
            {activeSessions.map((session) => (
              <DropdownMenuItem
                key={session.id}
                className={`flex flex-col items-start justify-start px-3 py-2 cursor-pointer ${
                  session.id === currentSessionId ? 'bg-blue-50' : ''
                }`}
                onClick={() => handleSelectSession(session)}
              >
                <div className="flex w-full items-center justify-between">
                  <span className="font-medium">
                    {formatSessionTitle(session)}
                  </span>
                  {session.id === currentSessionId && (
                    <Check size={16} className="text-blue-600" />
                  )}
                </div>
                <div className="flex w-full items-center justify-between mt-1">
                  <span className="text-xs text-gray-500">
                    {getParticipantText(session)}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {session.session_started ? "Started" : "Waiting"}
                  </Badge>
                </div>
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default SessionsDropdown;
