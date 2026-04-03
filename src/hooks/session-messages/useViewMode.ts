/**
 * use View Mode
 *
 * Session message hook for the AIfacilitator application.
 */

import { useState } from 'react';

interface UseViewModeProps {
  isAdmin: boolean;
}

export const useViewMode = ({ isAdmin }: UseViewModeProps) => {
  const [viewMode, setViewMode] = useState<"participant" | "admin">(
    isAdmin ? "admin" : "participant"
  );
  
  return {
    viewMode,
    setViewMode
  };
};
