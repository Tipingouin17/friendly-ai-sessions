
import { useQuery } from "@tanstack/react-query";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { useWorkshopCreation } from "@/hooks/useWorkshopCreation";
import { fetchFacilitators, fetchWorkshops } from "@/services/facilitatorService";

import { FacilitatorStepper } from "@/components/facilitator/FacilitatorStepper";
import { FacilitatorSelection } from "@/components/facilitator/FacilitatorSelection";
import { WorkshopSelection } from "@/components/facilitator/WorkshopSelection";
import { WorkshopSetup } from "@/components/facilitator/WorkshopSetup";
import { PlanLimitAlert } from "@/components/facilitator/PlanLimitAlert";
import { StepNavigation } from "@/components/facilitator/StepNavigation";

const MyFacilitators = () => {
  const {
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
  } = useWorkshopCreation();

  const {
    hasReachedSessionLimit,
    hasReachedFacilitatorLimit,
    maxSessions,
    currentSessionCount,
    isLoading: limitsLoading
  } = usePlanLimits();

  const {
    data: facilitators = [],
    isLoading: isFacilitatorsLoading
  } = useQuery({
    queryKey: ['facilitators'],
    queryFn: fetchFacilitators
  });

  const {
    data: workshops = [],
    isLoading: isWorkshopsLoading
  } = useQuery({
    queryKey: ['workshops', selectedFacilitator],
    queryFn: () => fetchWorkshops(selectedFacilitator),
    enabled: currentStep === 2
  });

  // Determine if steps should be disabled based on limits
  const isStep1Disabled = false; // Never disable selection of facilitators
  const isStep2Disabled = !selectedFacilitator; // Only disable if no facilitator selected
  const isStep3Disabled = !selectedWorkshop; // Only disable if no workshop selected
  
  // Only creation of new sessions should be blocked by session limit
  const isSubmitDisabled = hasReachedSessionLimit || !selectedWorkshop || !description.trim() || !agreed;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-4 md:py-6">
        <PlanLimitAlert 
          hasReachedSessionLimit={hasReachedSessionLimit}
          hasReachedFacilitatorLimit={hasReachedFacilitatorLimit}
          currentSessionCount={currentSessionCount}
          maxSessions={maxSessions}
          onUpgrade={handleUpgradePlan}
        />
        
        <div className="bg-white rounded-3xl shadow-lg p-4 md:p-6">
          <FacilitatorStepper 
            currentStep={currentStep}
            setCurrentStep={setCurrentStep}
            isStep1Disabled={isStep1Disabled}
            isStep2Disabled={isStep2Disabled}
            isStep3Disabled={isStep3Disabled}
          />

          <div className="space-y-6 md:space-y-8">
            {/* Step 1: Facilitator Selection */}
            <div className={`transition-all ${currentStep === 1 ? 'block' : 'hidden'}`}>
              <FacilitatorSelection 
                facilitators={facilitators} 
                selectedFacilitator={selectedFacilitator} 
                onSelect={setSelectedFacilitator} 
                isLoading={isFacilitatorsLoading} 
              />
            </div>

            {/* Step 2: Workshop Selection */}
            <div className={`transition-all ${currentStep === 2 ? 'block' : 'hidden'} ${!selectedFacilitator ? 'opacity-50 pointer-events-none' : ''}`}>
              <WorkshopSelection 
                workshops={workshops} 
                selectedWorkshop={selectedWorkshop} 
                onSelect={setSelectedWorkshop} 
                isLoading={isWorkshopsLoading} 
              />
            </div>

            {/* Step 3: Workshop Setup */}
            <div className={`transition-all ${currentStep === 3 ? 'block' : 'hidden'} ${!selectedWorkshop ? 'opacity-50 pointer-events-none' : ''}`}>
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

          <StepNavigation
            currentStep={currentStep}
            onPrevious={handlePrevious}
            onNext={handleNext}
            onSubmit={() => handleSubmit(hasReachedSessionLimit)}
            isNextDisabled={(currentStep === 1 && !selectedFacilitator) || (currentStep === 2 && !selectedWorkshop)}
            isSubmitDisabled={isSubmitDisabled}
            hasReachedSessionLimit={hasReachedSessionLimit}
          />
        </div>
      </div>
    </div>
  );
};

export default MyFacilitators;
