/**
 * Admin Action Button
 *
 * Session component for the AIfacilitator application.
 */

import React from 'react';
import { Button } from "@/components/ui/button";
import { AdminActionButtonProps } from './types';

const AdminActionButton: React.FC<AdminActionButtonProps> = ({
  onClick,
  icon,
  label
}) => {
  return (
    <Button
      variant="outline" 
      size="sm" 
      className="flex items-center gap-2"
      onClick={onClick}
    >
      {icon}
      <span>{label}</span>
    </Button>
  );
};

export default AdminActionButton;
