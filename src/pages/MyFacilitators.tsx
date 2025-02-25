
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { FacilitatorSelection } from "@/components/facilitator/FacilitatorSelection";
import { WorkshopSelection } from "@/components/facilitator/WorkshopSelection";
import { WorkshopSetup } from "@/components/facilitator/WorkshopSetup";
import { Stepper } from "@/components/facilitator/StepIndicator";
import { Step } from "@/types/facilitator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useFacilitators } from "@/hooks/useFacilitators";
import { useWorkshops } from "@/hooks/useWorkshops";

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
  const { facilitators, isLoading: isFacilitatorsLoading } = useFacilitators();
  const { workshops, isLoading: isWorkshopsLoading } = useWorkshops(selectedFacilitator);

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

      // Create the conversation
      const { data: conversation, error: conversationError } = await supabase
        .from('conversations')
        .insert({
          participant_description: description,
          language,
          participants: participantCount,
          sessions_id: selectedWorkshop,
          accept_terms_and_conditions: agreed,
          is_saved: false,
          is_session_ended: false,
          status: 'active'
        })
        .select('id')
        .single();

      if (conversationError) throw conversationError;

      // Create session history entry
      const { error: historyError } = await supabase
        .from('sessions_history')
        .insert({
          session_id: selectedWorkshop,
          facilitator_id: selectedFacilitator,
          participant_count: participantCount,
          language
        });

      if (historyError) {
        console.error('Error creating session history:', historyError);
      }

      navigate('/session', { 
        replace: true,
        state: { 
          newConversationId: conversation.id,
          replace: true
        }
      });
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
          <Stepper value={currentStep} />

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
