
import { useState } from "react";
import { ChevronLeft, ChevronRight, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { FacilitatorSelection } from "@/components/facilitator/FacilitatorSelection";
import { WorkshopSelection } from "@/components/facilitator/WorkshopSelection";
import { WorkshopSetup } from "@/components/facilitator/WorkshopSetup";
import { Step } from "@/types/facilitator";
import { Stepper, StepperItem, StepperTrigger, StepperIndicator, StepperContent, StepperSeparator } from "@/components/ui/stepper";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

const MyFacilitators = () => {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [selectedFacilitator, setSelectedFacilitator] = useState<number | null>(null);
  const [selectedWorkshop, setSelectedWorkshop] = useState<number | null>(null);
  const [participantCount, setParticipantCount] = useState(1);
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("English");
  const [agreed, setAgreed] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const { 
    hasReachedSessionLimit, 
    hasReachedFacilitatorLimit,
    maxSessions, 
    currentSessionCount,
    isLoading: limitsLoading 
  } = usePlanLimits();

  const { data: facilitators = [], isLoading: isFacilitatorsLoading } = useQuery({
    queryKey: ['facilitators'],
    queryFn: fetchFacilitators
  });

  const { data: workshops = [], isLoading: isWorkshopsLoading } = useQuery({
    queryKey: ['workshops', selectedFacilitator],
    queryFn: () => fetchSessions(selectedFacilitator),
    enabled: currentStep === 2
  });

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

  const handleSubmit = async () => {
    if (hasReachedSessionLimit) {
      toast({
        title: "Plan Limit Reached",
        description: "You've reached your plan's session limit. Please upgrade to create more sessions.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      if (!selectedWorkshop) {
        toast({
          title: "Error",
          description: "Please select a workshop",
          variant: "destructive",
        });
        return;
      }

      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();

      if (userError || !user) {
        toast({
          title: "Error",
          description: "You must be logged in to create a session",
          variant: "destructive",
        });
        return;
      }

      // Create the conversation with user_id
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          participant_description: description,
          language,
          participants: participantCount,
          sessions_id: selectedWorkshop,
          accept_terms_and_conditions: agreed,
          is_saved: false,
          is_session_ended: false,
          user_id: user.id
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error creating conversation:', error);
        toast({
          title: "Error",
          description: "Failed to create conversation. Please try again.",
          variant: "destructive",
        });
        return;
      }

      if (data?.id) {
        navigate('/session', { 
          replace: true,
          state: { 
            newConversationId: data.id,
            replace: true
          }
        });
      }
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handleUpgradePlan = () => {
    navigate('/pricing');
  };

  // Determine if steps should be disabled based on limits
  const isStep1Disabled = hasReachedFacilitatorLimit;
  const isStep2Disabled = hasReachedSessionLimit || !selectedFacilitator;
  const isStep3Disabled = hasReachedSessionLimit || !selectedWorkshop;

  return (
    <div className="min-h-screen pt-16 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Plan limit alert at the top */}
        {(hasReachedSessionLimit || hasReachedFacilitatorLimit) && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Plan Limit Reached</AlertTitle>
            <AlertDescription className="flex justify-between items-center">
              <span>
                {hasReachedSessionLimit ? 
                  `You've used ${currentSessionCount} out of ${maxSessions} sessions available in your plan.` : 
                  "You've reached your facilitator limit in your current plan."}
              </span>
              <Button onClick={handleUpgradePlan} size="sm">
                Upgrade Plan
              </Button>
            </AlertDescription>
          </Alert>
        )}
        
        <div className="bg-white rounded-3xl shadow-lg p-8">
          <Stepper value={currentStep.toString()} onValueChange={(value) => setCurrentStep(parseInt(value) as Step)} className="mb-8">
            <div className="flex items-center gap-2 w-full">
              <StepperItem value="1" disabled={isStep1Disabled}>
                <StepperTrigger className="flex flex-col items-center gap-2">
                  <StepperIndicator>
                    {isStep1Disabled && <Lock className="h-3 w-3" />}
                  </StepperIndicator>
                  <div className="text-sm font-medium">Choose Facilitator</div>
                </StepperTrigger>
              </StepperItem>
              
              <StepperSeparator />
              
              <StepperItem value="2" disabled={isStep2Disabled}>
                <StepperTrigger className="flex flex-col items-center gap-2">
                  <StepperIndicator>
                    {isStep2Disabled && selectedFacilitator === null && <Lock className="h-3 w-3" />}
                  </StepperIndicator>
                  <div className="text-sm font-medium">Select Workshop</div>
                </StepperTrigger>
              </StepperItem>
              
              <StepperSeparator />
              
              <StepperItem value="3" disabled={isStep3Disabled}>
                <StepperTrigger className="flex flex-col items-center gap-2">
                  <StepperIndicator>
                    {isStep3Disabled && selectedWorkshop === null && <Lock className="h-3 w-3" />}
                  </StepperIndicator>
                  <div className="text-sm font-medium">Setup Participants</div>
                </StepperTrigger>
              </StepperItem>
            </div>
          </Stepper>

          <div className="space-y-8">
            {/* Step 1: Facilitator Selection - Blur when limit reached */}
            <div className={`transition-all ${currentStep === 1 ? 'block' : 'hidden'} ${hasReachedFacilitatorLimit ? 'opacity-50 pointer-events-none' : ''}`}>
              <FacilitatorSelection
                facilitators={facilitators}
                selectedFacilitator={selectedFacilitator}
                onSelect={setSelectedFacilitator}
                isLoading={isFacilitatorsLoading}
              />
            </div>

            {/* Step 2: Workshop Selection - Blur when limit reached */}
            <div className={`transition-all ${currentStep === 2 ? 'block' : 'hidden'} ${hasReachedSessionLimit ? 'opacity-50 pointer-events-none' : ''}`}>
              <WorkshopSelection
                workshops={workshops}
                selectedWorkshop={selectedWorkshop}
                onSelect={setSelectedWorkshop}
                isLoading={isWorkshopsLoading}
              />
            </div>

            {/* Step 3: Workshop Setup - Blur when limit reached */}
            <div className={`transition-all ${currentStep === 3 ? 'block' : 'hidden'} ${hasReachedSessionLimit ? 'opacity-50 pointer-events-none' : ''}`}>
              <WorkshopSetup
                participantCount={participantCount}
                setParticipantCount={setParticipantCount}
                description={description}
                setDescription={setDescription}
                language={language}
                setLanguage={setLanguage}
                agreed={agreed}
                setAgreed={setAgreed}
              />
            </div>
          </div>

          <div className="flex justify-between mt-8">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>

            {currentStep < 3 ? (
              <Button
                onClick={handleNext}
                disabled={
                  (currentStep === 1 && (!selectedFacilitator || hasReachedFacilitatorLimit)) ||
                  (currentStep === 2 && (!selectedWorkshop || hasReachedSessionLimit))
                }
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!agreed || !description.trim() || hasReachedSessionLimit}
              >
                Start Session
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper functions for fetching data
const fetchFacilitators = async () => {
  const { data, error } = await supabase
    .from('facilitators')
    .select('*')
    .order('order', { ascending: true });
  
  if (error) throw error;
  return data;
};

const fetchSessions = async (facilitatorId: number | null) => {
  const query = supabase
    .from('sessions')
    .select('*, facilitator:facilitators!inner(*)')
    .eq('status', true);

  if (facilitatorId) {
    query.eq('facilitator', facilitatorId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
};

export default MyFacilitators;
