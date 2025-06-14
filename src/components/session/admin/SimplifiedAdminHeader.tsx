
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, LayoutDashboard, Users, MessageSquare, Clock, AlertCircle } from "lucide-react";
import AdminQrDialog from "./AdminQrDialog";
import AdminMessageDialog from "./AdminMessageDialog";
import AdminWrapUpDialog from "./AdminWrapUpDialog";
import SessionStatusBadge from "./SessionStatusBadge";
import { ConversationWithSession } from "@/types/database";
import SessionsDropdown from "./SessionsDropdown";
import { useAdminSessions } from "@/hooks/useAdminSessions";
import { useSessionClosure } from "@/hooks/useSessionClosure";
import SessionClosureDialog from "../SessionClosureDialog";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface SimplifiedAdminHeaderProps {
  conversation: ConversationWithSession | null;
  isSessionPaused: boolean;
  toggleSessionState: () => void;
  handleAdminMessage: (message: string) => void;
  onExportData?: () => void;
  currentParticipantCount: number;
  maxParticipants: number;
  totalMessages: number;
}

const SimplifiedAdminHeader: React.FC<SimplifiedAdminHeaderProps> = ({
  conversation,
  isSessionPaused,
  toggleSessionState,
  handleAdminMessage,
  onExportData,
  currentParticipantCount,
  maxParticipants,
  totalMessages
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { activeSessions, isLoading, refreshSessions } = useAdminSessions();
  const { 
    isClosing, 
    closeSessionAndGenerateReport
  } = useSessionClosure();
  const [isWrappingUp, setIsWrappingUp] = useState(false);
  
  const [showClosureDialog, setShowClosureDialog] = useState(false);
  
  const handleBack = () => {
    // Navigate back to the sessions dashboard
    navigate('/past-workshops?auto=true');
  };

  const handleCloseSession = async () => {
    if (!conversation?.id) {
      console.error("❌ No conversation ID available for closing session");
      toast({
        title: "Error",
        description: "No conversation ID available",
        variant: "destructive"
      });
      return;
    }
    
    console.log("🚀 User confirmed session closure, proceeding...");
    const success = await closeSessionAndGenerateReport(conversation.id);
    if (success) {
      setShowClosureDialog(false);
      console.log("✅ Session closed successfully, navigating to report view");
      // Navigate to the session report view
      navigate(`/session/report/${conversation.id}`);
    } else {
      console.error("❌ Session closure failed, keeping dialog open");
    }
  };

  const handleWrapUp = async () => {
    if (!conversation?.id) {
      console.error("❌ No conversation ID available for wrap up");
      toast({
        title: "Error",
        description: "No conversation available",
        variant: "destructive"
      });
      return;
    }

    console.log("📝 Admin triggered session wrap up");
    setIsWrappingUp(true);

    try {
      // Send a special wrap up message to trigger AI facilitator response
      const { error } = await supabase.functions.invoke('handle-facilitator-response', {
        body: {
          messages: [],
          conversationId: conversation.id,
          generateReport: false,
          wrapUpSession: true
        }
      });

      if (error) {
        console.error("❌ Error triggering wrap up:", error);
        toast({
          title: "Error",
          description: "Failed to trigger session wrap up",
          variant: "destructive"
        });
      } else {
        console.log("✅ Wrap up request sent successfully");
        toast({
          title: "Session Wrap Up",
          description: "The AI facilitator will now begin wrapping up the session",
        });
      }
    } catch (error) {
      console.error("❌ Error in wrap up request:", error);
      toast({
        title: "Error",
        description: "Failed to trigger session wrap up",
        variant: "destructive"
      });
    } finally {
      setIsWrappingUp(false);
    }
  };

  const handleExportClick = () => {
    if (!conversation?.id) {
      console.error("❌ No conversation available for export");
      toast({
        title: "Error",
        description: "No conversation available",
        variant: "destructive"
      });
      return;
    }

    if (conversation.is_session_ended) {
      console.log("📄 Session already ended, navigating to existing report");
      // Navigate to existing report
      navigate(`/session/report/${conversation.id}`);
      return;
    }

    console.log("📋 Opening session closure dialog for active session");
    setShowClosureDialog(true);
  };

  const getSessionTitle = () => {
    if (!conversation) return "Loading...";
    return conversation.sessions?.title || "Untitled Session";
  };

  const isSessionEnded = conversation?.is_session_ended || false;
  
  // Calculate session duration
  const sessionStartTime = conversation?.created_at 
    ? new Date(conversation.created_at) 
    : new Date();
  const sessionDurationMinutes = Math.round(
    (new Date().getTime() - sessionStartTime.getTime()) / (1000 * 60)
  );

  // Debug logging for conversation state
  React.useEffect(() => {
    console.log("🔍 SimplifiedAdminHeader conversation state:", {
      conversationId: conversation?.id,
      isSessionEnded,
      hasCloseFunction: !!closeSessionAndGenerateReport,
      isClosing
    });
  }, [conversation?.id, isSessionEnded, isClosing]);

  return (
    <>
      <div className="bg-white border-b shadow-sm sticky top-0 z-10">
        {/* Main header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" onClick={handleBack} title="Back to Sessions Dashboard">
              <LayoutDashboard className="h-5 w-5" />
            </Button>
            
            <div className="flex flex-col">
              <h1 className="text-xl font-semibold">{getSessionTitle()}</h1>
              <div className="flex items-center mt-1">
                <SessionStatusBadge
                  isActive={!isSessionPaused && !isSessionEnded}
                  sessionStarted={conversation?.session_started || false}
                />
                {isSessionEnded && (
                  <span className="ml-2 text-sm text-gray-500">Session Ended</span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center gap-1"
              onClick={handleExportClick}
              disabled={isClosing}
            >
              {isClosing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                  <span>Closing...</span>
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4" />
                  <span>
                    {isSessionEnded ? 'View Report' : 'Close & Get Report'}
                  </span>
                </>
              )}
            </Button>
            
            {!isSessionEnded && (
              <>
                <AdminWrapUpDialog 
                  onWrapUp={handleWrapUp}
                  isWrappingUp={isWrappingUp}
                />
                <SessionsDropdown 
                  currentSessionId={conversation?.id || null}
                  activeSessions={activeSessions}
                  isLoading={isLoading}
                  onRefresh={refreshSessions}
                />
                <AdminMessageDialog onSendMessage={handleAdminMessage} />
                <AdminQrDialog conversationId={conversation?.id || null} />
              </>
            )}
          </div>
        </div>

        {/* Simplified metrics bar */}
        <div className="px-4 py-3 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">{currentParticipantCount}/{maxParticipants}</span>
                <span className="text-xs text-gray-500">participants</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <MessageSquare className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">{totalMessages}</span>
                <span className="text-xs text-gray-500">messages</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium">{sessionDurationMinutes}</span>
                <span className="text-xs text-gray-500">minutes</span>
              </div>
            </div>
            
            <div className="text-xs text-gray-500">
              Session ID: {conversation?.id || 'Loading...'}
            </div>
          </div>
        </div>
      </div>

      <SessionClosureDialog
        isOpen={showClosureDialog}
        onClose={() => setShowClosureDialog(false)}
        onConfirm={handleCloseSession}
        isClosing={isClosing}
        participantCount={conversation?.current_participants || 0}
        sessionTitle={getSessionTitle()}
      />
    </>
  );
};

export default SimplifiedAdminHeader;
