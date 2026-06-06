/**
 * use Workshop Creation
 *
 * Hook for the AIfacilitator application.
 */

import { useMemo, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import api from "@/lib/api";
import { Step } from "@/types/facilitator";
import { createConversation } from "@/services/facilitatorService";
import { useNavigateToSession } from "@/hooks/session-joining/useNavigateToSession";
import { useNavigate } from "react-router-dom";
import { trackSessionCreated } from "@/lib/tracking";

export const useWorkshopCreation = () => {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [selectedFacilitator, setSelectedFacilitator] = useState<number | null>(null);
  const [selectedWorkshop, setSelectedWorkshop] = useState<number | null>(null);
  const [participantCount, setParticipantCount] = useState(1);
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("en");
  const [agreed, setAgreed] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState<number | "">("");
  const [scheduledStartAt, setScheduledStartAt] = useState<Date>(() => new Date());
  /** True while the session creation API call (+ OpenAI) is in-flight */
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Secure navigation for host session page
  const { navigateToHostSession } = useNavigateToSession();
  const navigate = useNavigate();

  const isScheduled = useMemo(() => {
    return scheduledStartAt.getTime() > Date.now() + 60_000;
  }, [scheduledStartAt]);

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
      // Redirect to pricing page instead of showing a toast
      navigate('/pricing');
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

      const { data: { session } } = await api.auth.getSession();
      const user = session?.user ?? null;

      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to create a session",
          variant: "destructive"
        });
        return;
      }

      // Show spinner immediately — the OpenAI call can take 10–15 s
      setIsSubmitting(true);

      const data = await createConversation({
        description,
        language,
        participantCount,
        workshopId: selectedWorkshop,
        agreed,
        userId: user.id,
        durationMinutes: durationMinutes !== "" ? Number(durationMinutes) : undefined,
        scheduledStartAt: isScheduled ? scheduledStartAt : undefined,
      });

        if (data?.id) {
          const eventParameters = {
            session_id: data.id,
            workshop_id: selectedWorkshop,
            facilitator_id: selectedFacilitator,
            participant_count: participantCount,
            language: language,
            is_scheduled: isScheduled,
          };

          trackSessionCreated(eventParameters);


        if (isScheduled) {
          navigate(`/schedule-invitations?id=${data.id}`);
          toast({
            title: "Session Scheduled",
            description: "Draft your participant invitations before the scheduled start.",
          });
          return;
        }

        // Navigate immediately — the session page shows a ThinkingIndicator
        // while the AI generates the welcome message server-side.
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
    } finally {
      setIsSubmitting(false);
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
    durationMinutes,
    setDurationMinutes,
    scheduledStartAt,
    setScheduledStartAt,
    isScheduled,
    isSubmitting,
    handleNext,
    handlePrevious,
    handleSubmit,
    handleUpgradePlan
  };
};
