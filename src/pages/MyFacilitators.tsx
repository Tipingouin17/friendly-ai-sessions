
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { FacilitatorSelection } from "@/components/facilitator/FacilitatorSelection";
import { WorkshopSelection } from "@/components/facilitator/WorkshopSelection";
import { WorkshopSetup } from "@/components/facilitator/WorkshopSetup";
import { Step, Facilitator, Workshop } from "@/types/facilitator";
import { Stepper, StepperIndicator, StepperItem, StepperSeparator, StepperTitle, StepperTrigger } from "@/components/ui/stepper";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

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
    if (selectedFacilitator && selectedWorkshop) {
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
        .select()
        .single();

      if (!error && data) {
        navigate(`/session/${data.id}`);
      }
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16 bg-[#FFC107]/10">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-4xl font-bold text-center mb-4">Select Your AI Facilitator</h1>
        <p className="text-lg text-muted-foreground text-center mb-12">
          Choose a facilitator and workshop type to begin your session
        </p>

        <div className="bg-white rounded-3xl shadow-lg p-8">
          <div className="mb-8">
            <Stepper value={currentStep - 1} onValueChange={step => setCurrentStep(step + 1 as Step)} className="max-w-2xl mx-auto">
              {steps.map(({ step, title }) => (
                <StepperItem key={step} step={step - 1} className="[&:not(:last-child)]:flex-1">
                  <StepperTrigger>
                    <StepperIndicator />
                    <StepperTitle>{title}</StepperTitle>
                  </StepperTrigger>
                  {step < steps.length && <StepperSeparator />}
                </StepperItem>
              ))}
            </Stepper>
          </div>

          <div className="mb-8">
            {currentStep === 1 && (
              <FacilitatorSelection 
                facilitators={facilitators} 
                selectedFacilitator={selectedFacilitator} 
                onSelect={setSelectedFacilitator} 
              />
            )}

            {currentStep === 2 && (
              <WorkshopSelection 
                workshops={workshops} 
                selectedWorkshop={selectedWorkshop} 
                onSelect={setSelectedWorkshop} 
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

          <div className="flex justify-between">
            {currentStep > 1 ? (
              <Button variant="outline" onClick={handlePrevious}>
                <ChevronLeft className="w-4 h-4 mr-2" /> Previous
              </Button>
            ) : (
              <div></div>
            )}
            {currentStep < 3 ? (
              <Button onClick={handleNext}>
                Next <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={!agreed}>
                Let's Begin!
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyFacilitators;
