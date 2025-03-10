
export interface AdminHeaderProps {
  sessionTitle: string;
  facilitatorTitle: string;
  currentParticipants?: number;
  maxParticipants?: number;
  isSessionActive?: boolean;
  onToggleSessionState?: () => void;
  onSendAdminMessage?: (message: string) => void;
  onExportData?: () => void;
}

export interface AdminActionButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

export interface AdminMessageDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSendMessage: (message: string) => void;
}

export interface AdminQrDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  joinUrl: string;
  currentParticipants: number;
  maxParticipants: number;
  onCopyLink: () => void;
}
