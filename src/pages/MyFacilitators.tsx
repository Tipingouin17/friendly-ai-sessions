
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { FacilitatorSelection } from "@/components/facilitator/FacilitatorSelection";
import { WorkshopSelection } from "@/components/facilitator/WorkshopSelection";
import { WorkshopSetup } from "@/components/facilitator/WorkshopSetup";
import { Step, Facilitator, Workshop } from "@/types/facilitator";
import { Stepper } from "@/components/ui/stepper";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";

const steps = [{
  step: 1,
  title: "Choose your facilitator"
}, {
  step: 2,
  title: "Select workshop type"
}, {
  step: 3,
  title: "Describe participants"
}];

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
    try {
      if (!selectedWorkshop) {
        toast({
          title: "Error",
          description: "Please select a workshop",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase
        .from('conversations')
        .insert({
          participant_description: description,
          language,
          participants: participantCount,
          sessions_id: selectedWorkshop,
          accept_terms_and_conditions: agreed,
          is_saved: false,
          is_session_ended: false
        })
        .select('*')
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

      if (data) {
        toast({
          title: "Success",
          description: "Session created successfully!",
        });
        // Ensure we navigate to the correct path with the new conversation ID
        navigate(`/session/${data.id}`);
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

  return (
    <div className="min-h-screen pt-16 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-3xl shadow-lg p-8">
          <Stepper value={currentStep} className="mb-8">
            {steps.map((step, index) => (
              <div key={step.step} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    step.step <= currentStep
                      ? "bg-primary text-white"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {step.step}
                </div>
                <span className="ml-3 text-sm font-medium">{step.title}</span>
                {index < steps.length - 1 && (
                  <div className="flex-1 h-px bg-gray-200 mx-4" />
                )}
              </div>
            ))}
          </Stepper>

          <div className="space-y-8">
            {currentStep === 1 && (
              <FacilitatorSelection
                facilitators={facilitators}
                selectedFacilitator={selectedFacilitator}
                onSelect={setSelectedFacilitator}
                isLoading={isFacilitatorsLoading}
              />
            )}

            {currentStep === 2 && (
              <WorkshopSelection
                workshops={workshops}
                selectedWorkshop={selectedWorkshop}
                onSelect={setSelectedWorkshop}
                isLoading={isWorkshopsLoading}
              />
            )}

            {currentStep === 3 && (
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
            )}
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
                  (currentStep === 1 && !selectedFacilitator) ||
                  (currentStep === 2 && !selectedWorkshop)
                }
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!agreed || !description.trim()}
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

export default MyFacilitators;
