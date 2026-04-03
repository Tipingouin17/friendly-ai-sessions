/**
 * use Admin View State
 *
 * Hook for the AIfacilitator application.
 */

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';

interface UseAdminViewStateProps {
  isAdmin: boolean;
  participantCount: number;
  currentResponses: number;
}

export function useAdminViewState({
  isAdmin,
  participantCount,
  currentResponses
}: UseAdminViewStateProps) {
  const [viewMode, setViewMode] = useState<"participant" | "admin">("admin");
  const { toast } = useToast();
  
  // Force admin view mode if user is admin
  useEffect(() => {
    if (isAdmin && viewMode !== "admin") {
      setViewMode("admin");
    }
  }, [isAdmin, viewMode]);
  
  // Show participation statistics when they change
  useEffect(() => {
    if (isAdmin && participantCount > 0 && currentResponses > 0) {
      toast({
        title: "Participant Activity",
        description: `${currentResponses} of ${participantCount} participants have responded`,
      });
    }
  }, [isAdmin, participantCount, currentResponses, toast]);
  
  const toggleViewMode = () => {
    const newMode = viewMode === "admin" ? "participant" : "admin";
    setViewMode(newMode);
    
    toast({
      title: `Switched to ${newMode} view`,
      description: newMode === "admin" 
        ? "You can now see all participant responses" 
        : "You can now see the session as a participant",
    });
  };
  
  return {
    viewMode,
    setViewMode,
    toggleViewMode
  };
}
