/**
 * View Mode Selector
 *
 * Session component for the AIfacilitator application.
 */

import React from 'react';
import ViewModeToggle from "./ViewModeToggle";

interface ViewModeSelectorProps {
  viewMode: "participant" | "admin";
  setViewMode: (mode: "participant" | "admin") => void;
  isAdmin: boolean;
}

const ViewModeSelector: React.FC<ViewModeSelectorProps> = ({ 
  viewMode, 
  setViewMode, 
  isAdmin 
}) => {
  if (!isAdmin) return null;
  
  return (
    <ViewModeToggle 
      viewMode={viewMode} 
      setViewMode={setViewMode}
      isAdmin={isAdmin}
    />
  );
};

export default ViewModeSelector;
