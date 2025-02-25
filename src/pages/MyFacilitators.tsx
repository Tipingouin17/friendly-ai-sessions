
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
    <div className="min-h-screen pt-24 pb-16 bg-[#FEF7E4]">
      <div className="max-w-5xl mx-auto px-4">
        <h1 className="text-5xl font-bold text-center mb-6">MyFacilitator</h1>
        <p className="text-xl text-gray-600 text-center mb-16">
          Follow these simple steps to set up your workshop session
        </p>

        <StepIndicator currentStep={currentStep} />

        <div className="bg-white rounded-[2rem] shadow-lg p-10">
          <div className="mb-10">
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
              <Button 
                variant="outline" 
                onClick={handlePrevious}
                className="text-lg px-6 py-3 h-auto"
              >
                <ChevronLeft className="w-5 h-5 mr-2" /> Previous
              </Button>
            ) : (
              <div></div>
            )}
            {currentStep < 3 ? (
              <Button 
                onClick={handleNext}
                className="text-lg px-6 py-3 h-auto"
              >
                Next <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            ) : (
              <Button 
                onClick={handleSubmit} 
                disabled={!agreed}
                className="text-lg px-6 py-3 h-auto"
              >
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
