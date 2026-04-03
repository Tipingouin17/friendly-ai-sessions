/**
 * Admin Notification Manager
 *
 * Session component for the AIfacilitator application.
 */

import React from 'react';
import AdminNotification from "./AdminNotification";

interface AdminNotificationManagerProps {
  isAdmin: boolean;
  message: string | null;
  onClose: () => void;
}

const AdminNotificationManager: React.FC<AdminNotificationManagerProps> = ({
  isAdmin,
  message,
  onClose
}) => {
  if (isAdmin) return null;
  
  return (
    <AdminNotification 
      message={message} 
      onClose={onClose}
    />
  );
};

export default AdminNotificationManager;
