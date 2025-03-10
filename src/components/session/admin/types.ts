
export interface AdminHeaderProps {
  sessionTitle: string;
  facilitatorTitle?: string;
  currentParticipants: number;
  maxParticipants: number;
  isSessionActive: boolean;
  onToggleSessionState: () => void;
  onSendAdminMessage: (message: string) => void;
  onExportData: () => void;
  sessionState?: {
    objective?: string;
    language?: string;
    sessionStarted?: boolean;
  };
}

export interface AdminActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export interface AdminQrDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  joinUrl: string;
  currentParticipants: number;
  maxParticipants: number;
  onCopyLink: () => void;
}

export interface AdminMessageDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSendMessage: (message: string) => void;
}
