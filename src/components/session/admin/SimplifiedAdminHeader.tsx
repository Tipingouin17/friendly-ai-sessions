/**
 * Simplified Admin Header
 *
 * Session component for the AIfacilitator application.
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  MessageSquare, 
  QrCode, 
  LogOut,
  BarChart3,
  Clock
} from 'lucide-react';
import AdminQrDialog from './AdminQrDialog';
import AdminMessageDialog from './AdminMessageDialog';
import AdminWrapUpDialog from './AdminWrapUpDialog';
import SessionAnalyticsDashboard from './SessionAnalyticsDashboard';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface SimplifiedAdminHeaderProps {
  conversationData: any;
  onCloseAndReport: () => void;
  onSendMessage: (message: string) => void;
  isGeneratingReport: boolean;
  participantCount: number;
  maxParticipants: number;
  onWrapUp: () => void;
  isWrappingUp: boolean;
}

const SimplifiedAdminHeader: React.FC<SimplifiedAdminHeaderProps> = ({
  conversationData,
  onCloseAndReport,
  onSendMessage,
  isGeneratingReport,
  participantCount,
  maxParticipants,
  onWrapUp,
  isWrappingUp
}) => {
  const [showAnalytics, setShowAnalytics] = useState(false);
  
  const sessionTitle = conversationData?.sessions?.title || 'Workshop Session';
  const isSessionEnded = conversationData?.is_session_ended;

  return (
    <div className="bg-white border-b border-gray-200 p-4 space-y-4">
      {/* Main Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              Admin: {sessionTitle}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline">
                {participantCount}/{maxParticipants} participants
              </Badge>
              {isSessionEnded && (
                <Badge variant="secondary">Session Ended</Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Analytics Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAnalytics(!showAnalytics)}
            className="flex items-center gap-2"
          >
            <BarChart3 className="h-4 w-4" />
            Analytics
          </Button>

          {/* Wrap Up Session */}
          <AdminWrapUpDialog 
            onWrapUp={onWrapUp}
            isWrappingUp={isWrappingUp}
          />

          {/* Send Message */}
          <AdminMessageDialog onSendMessage={onSendMessage} />

          {/* QR Code */}
          <AdminQrDialog conversationId={conversationData?.id || null} />

          {/* Close & Report */}
          <Button
            onClick={onCloseAndReport}
            disabled={isGeneratingReport}
            className="flex items-center gap-2"
          >
            {isGeneratingReport ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Generating...</span>
              </>
            ) : (
              <>
                <LogOut className="h-4 w-4" />
                <span>Close & Get Report</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Analytics Dashboard */}
      <Collapsible open={showAnalytics} onOpenChange={setShowAnalytics}>
        <CollapsibleContent>
          {conversationData?.id && (
            <SessionAnalyticsDashboard 
              conversationId={conversationData.id} 
              className="mt-4"
            />
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default SimplifiedAdminHeader;
