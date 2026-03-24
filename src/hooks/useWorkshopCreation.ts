
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Step } from "@/types/facilitator";
import { createConversation } from "@/services/facilitatorService";
import { useNavigateToSession } from "@/hooks/session-joining/useNavigateToSession";

export const useWorkshopCreation = () => {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [selectedFacilitator, setSelectedFacilitator] = useState<number | null>(null);
  const [selectedWorkshop, setSelectedWorkshop] = useState<number | null>(null);
  const [participantCount, setParticipantCount] = useState(1);
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("en");
  const [agreed, setAgreed] = useState(false);
  const { toast } = useToast();

  // Secure navigation for host session page
  const { navigateToHostSession } = useNavigateToSession();

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(prev => (prev === 1 ? 2 : 3) as Step);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => (prev === 3 ? 2 : 1) as Step);
      if (currentStep === 2) {
        setSelectedWorkshop(null);
      }
    }
  };

  const handleSubmit = async (hasReachedSessionLimit: boolean) => {
    if (hasReachedSessionLimit) {
      toast({
        title: "Plan Limit Reached",
        description: "You've reached your plan's session limit. Please upgrade to create more sessions.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      if (!selectedWorkshop) {
        toast({
          title: "Error",
          description: "Please select a workshop",
          variant: "destructive"
        });
        return;
      }
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        toast({
          title: "Error",
          description: "You must be logged in to create a session",
          variant: "destructive"
        });
        return;
      }

      const data = await createConversation({
        description,
        language,
        participantCount,
        workshopId: selectedWorkshop,
        agreed,
        userId: user.id
      });

      if (data?.id) {

        // Use secure navigation for host sessions instead of direct navigate
        await navigateToHostSession(data.id);

        toast({
          title: "Session Created",
          description: "Your host session has been created successfully.",
        });
      }
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleUpgradePlan = () => {
    window.location.assign('/pricing');
  };

  return {
    currentStep,
    setCurrentStep,
    selectedFacilitator,
    setSelectedFacilitator,
    selectedWorkshop,
    setSelectedWorkshop,
    participantCount,
    setParticipantCount,
    description,
    setDescription,
    language,
    setLanguage,
    agreed,
    setAgreed,
    handleNext,
    handlePrevious,
    handleSubmit,
    handleUpgradePlan
  };
};
