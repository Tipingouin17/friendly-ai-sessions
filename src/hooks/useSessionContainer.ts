/**
 * use Session Container
 *
 * Hook for the AIfacilitator application.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from "@/components/ui/use-toast";
import { Message, ParticipantInfo } from "@/types/chat";

interface UseSessionContainerProps {
  canGenerateReports: boolean;
  onGenerateReport?: () => void;
  conversationId: number | null;
}

export const useSessionContainer = ({
  canGenerateReports,
  onGenerateReport,
  conversationId
}: UseSessionContainerProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isQrDialogOpen, setIsQrDialogOpen] = useState(false);
  
  // Generate join URL
  const baseUrl = window.location.origin;
  // Update to use the correct join-session path
  const joinUrl = `${baseUrl}/join-session?id=${conversationId}`;
  
  // Check if we're on a mobile device
  const isMobile = window.innerWidth < 768;
  
  const handleGenerateReport = () => {
    if (!canGenerateReports) {
      toast({
        title: "Feature Not Available",
        description: "Report generation is not available in your current plan. Please upgrade to generate session reports.",
        variant: "destructive",
      });
      
      return;
    }
    
    if (onGenerateReport) {
      onGenerateReport();
    }
  };
  
  const handleUpgradePlan = () => {
    navigate('/pricing');
  };

  return {
    isMobile,
    joinUrl,
    isQrDialogOpen,
    setIsQrDialogOpen,
    handleGenerateReport,
    handleUpgradePlan
  };
};
