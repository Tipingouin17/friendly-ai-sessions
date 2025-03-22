
import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import AdminQrDialog from "./AdminQrDialog";
import AdminMessageDialog from "./AdminMessageDialog";
import SessionStatusBadge from "./SessionStatusBadge";
import { ConversationWithSession } from "@/types/database";
import SessionsDropdown from "./SessionsDropdown";
import { useAdminSessions } from "@/hooks/useAdminSessions";

interface AdminHeaderProps {
  conversation: ConversationWithSession | null;
  isSessionPaused: boolean;
  toggleSessionState: () => void;
  handleAdminMessage: (message: string) => void;
}

const AdminHeader: React.FC<AdminHeaderProps> = ({
  conversation,
  isSessionPaused,
  toggleSessionState,
  handleAdminMessage,
}) => {
  const navigate = useNavigate();
  const { activeSessions, isLoading, refreshSessions } = useAdminSessions();
  
  const handleBack = () => {
    navigate('/');
  };

  // Get session title
  const getSessionTitle = () => {
    if (!conversation) return "Loading...";
    return conversation.sessions?.title || "Untitled Session";
  };

  return (
    <div className="flex flex-col w-full sticky top-0 z-10 bg-white border-b pb-2">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <div className="flex flex-col">
            <h1 className="text-xl font-semibold">{getSessionTitle()}</h1>
            <div className="flex items-center mt-1">
              <SessionStatusBadge
                isActive={!isSessionPaused}
                sessionStarted={conversation?.session_started || false}
              />
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <SessionsDropdown 
            currentSessionId={conversation?.id || null}
            activeSessions={activeSessions}
            isLoading={isLoading}
            onRefresh={refreshSessions}
          />
          <AdminMessageDialog onSendMessage={handleAdminMessage} />
          <AdminQrDialog conversationId={conversation?.id || null} />
        </div>
      </div>
    </div>
  );
};

export default AdminHeader;
