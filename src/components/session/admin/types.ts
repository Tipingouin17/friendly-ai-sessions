/**
 * types
 *
 * Session component for the AIfacilitator application.
 */

export interface AdminHeaderProps {
  conversation: any;
  isSessionPaused: boolean;
  toggleSessionState: () => void;
  onExportData?: () => void;
}

export interface AdminActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export interface AdminQrDialogProps {
  conversationId: number | null;
}

export interface AdminMessageDialogProps {
  onSendMessage: (message: string) => void;
}

export interface SessionStatusBadgeProps {
  isActive: boolean;
  sessionStarted?: boolean;
}
