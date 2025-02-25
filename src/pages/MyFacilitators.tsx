
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { FacilitatorSelection } from "@/components/facilitator/FacilitatorSelection";
import { WorkshopSelection } from "@/components/facilitator/WorkshopSelection";
import { WorkshopSetup } from "@/components/facilitator/WorkshopSetup";
import { StepIndicator } from "@/components/facilitator/StepIndicator";
import { facilitators, workshops } from "@/data/facilitator-data";
import { Step } from "@/types/facilitator";

const MyFacilitators = () => {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [selectedFacilitator, setSelectedFacilitator] = useState<number | null>(null);
  const [selectedWorkshop, setSelectedWorkshop] = useState<number | null>(null);
  const [participantCount, setParticipantCount] = useState(1);
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("English");
  const [agreed, setAgreed] = useState(false);
  const navigate = useNavigate();

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep((prev) => (prev === 1 ? 2 : 3) as Step);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev === 3 ? 2 : 1) as Step);
    }
  };

  const handleSubmit = () => {
    navigate("/session");
  };

  return (
    <div className="min-h-screen pt-24 pb-16 bg-[#FFC107]/10">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-4xl font-bold text-center mb-4">MyFacilitator</h1>
        <p className="text-lg text-muted-foreground text-center mb-4">
          Welcome to our Facilitator Page, where you can discover the power of AI-driven facilitation tailored to your specific needs.
        </p>
        <p className="text-lg text-muted-foreground text-center mb-12">
          Unleash the full potential of MyFacilitator and enhance your sessions with intelligent guidance and support.
        </p>

        <div className="bg-white rounded-3xl shadow-lg p-8">
          <div className="flex justify-between items-start mb-8">
            <div className="flex-1">
              {currentStep === 1 && <h2 className="text-2xl font-semibold mb-6">Select your Facilitator</h2>}
              {currentStep === 2 && <h2 className="text-2xl font-semibold mb-6">Select your Workshop</h2>}
              {currentStep === 3 && <h2 className="text-2xl font-semibold mb-6">Set your Workshop</h2>}
            </div>
            <StepIndicator currentStep={currentStep} />
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
