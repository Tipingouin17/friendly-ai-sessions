
import React from "react";
import { Button } from "@/components/ui/button";
import { FileText, Eye, EyeOff, MessageSquare } from "lucide-react";

interface AdminControlsProps {
  onGenerateReport: () => void;
  isGeneratingReport: boolean;
  onViewModeToggle: () => void;
  viewMode: "participant" | "admin";
  onSendAdminMessage: (message: string) => void;
  responseCount: number;
  totalParticipants: number;
  isWaitingForResponses: boolean;
  isMobile: boolean;
}

const AdminControls: React.FC<AdminControlsProps> = ({
  onGenerateReport,
  isGeneratingReport,
  onViewModeToggle,
  viewMode,
  onSendAdminMessage,
  responseCount,
  totalParticipants,
  isWaitingForResponses,
  isMobile
}) => {
  const handleSendMessage = () => {
    // For now, we'll send an empty message or could open a dialog
    // This maintains the existing behavior while fixing the type error
    onSendAdminMessage("");
  };

  return (
    <div className="border-b bg-white px-3 py-2 sm:px-4">
      <div className="flex items-center justify-between max-w-4xl mx-auto">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onViewModeToggle}
            className={isMobile ? 'px-2' : 'px-3'}
          >
            {viewMode === "admin" ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {!isMobile && (viewMode === "admin" ? 'Admin View' : 'Participant View')}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleSendMessage}
            className={isMobile ? 'px-2' : 'px-3'}
          >
            <MessageSquare className="w-4 h-4" />
            {!isMobile && 'Send Message'}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {isWaitingForResponses && (
            <span className="text-sm text-gray-600">
              {responseCount}/{totalParticipants} responses
            </span>
          )}
          
          <Button
            onClick={onGenerateReport}
            disabled={isGeneratingReport}
            size="sm"
            variant="outline"
          >
            <FileText className="w-4 h-4" />
            {!isMobile && (isGeneratingReport ? 'Generating...' : 'Generate Report')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminControls;
