/**
 * AIfacilitators
 *
 * Page for the AIfacilitator application.
 */
import { useQuery } from "@tanstack/react-query";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { useWorkshopCreation } from "@/hooks/useWorkshopCreation";
import { fetchFacilitators, fetchUpcomingScheduledSessions, fetchWorkshops } from "@/services/facilitatorService";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useAuth } from "@/contexts/AuthContext";

import { FacilitatorStepper } from "@/components/facilitator/FacilitatorStepper";
import { FacilitatorSelection } from "@/components/facilitator/FacilitatorSelection";
import { WorkshopSelection } from "@/components/facilitator/WorkshopSelection";
import { WorkshopSetup } from "@/components/facilitator/WorkshopSetup";
import { PlanLimitAlert } from "@/components/facilitator/PlanLimitAlert";
import { StepNavigation } from "@/components/facilitator/StepNavigation";
import { CreateWorkshopModal } from "@/components/facilitator/CreateWorkshopModal";
import { createLogger } from '@/utils/debugLogger';

const log = createLogger('AIfacilitators', 'plan');

import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { clearAllParticipantState } from "@/lib/api";
import { WelcomeModal } from "@/components/onboarding/WelcomeModal";
import { UsageMeter } from "@/components/subscription/UsageMeter";
import { useOnboarding } from "@/hooks/useOnboarding";
import PageHead from "@/components/PageHead";
import ReferralBanner from "@/components/referral/ReferralBanner";

const AIfacilitators = () => {
  const [isClient, setIsClient] = useState(false);
  const [isCreateWorkshopModalOpen, setIsCreateWorkshopModalOpen] = useState(false);
  // Delay showing the welcome modal so it never flashes on top of a loading page
  const [showWelcome, setShowWelcome] = useState(false);
  const [hasAppliedOnboardingPreset, setHasAppliedOnboardingPreset] = useState(false);
  const [searchParams] = useSearchParams();

  // Must be declared before the useEffect that uses it to avoid TDZ error
  const { hasSeenWelcome, setHasSeenWelcome } = useOnboarding();

  // Hydration-safe client detection
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Clear ALL participant state (all scoped join tokens + session data) on host page load.
  useEffect(() => { clearAllParticipantState(); }, []);

  // Defer welcome modal by 600 ms so the page renders first
  useEffect(() => {
    if (!hasSeenWelcome) {
      const t = setTimeout(() => setShowWelcome(true), 600);
      return () => clearTimeout(t);
    }
  }, [hasSeenWelcome]);

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
    durationMinutes,
    setDurationMinutes,
    scheduledStartAt,
    setScheduledStartAt,
    isScheduled,
    scheduleValidation,
    handleNext,
    handlePrevious,
    handleSubmit,
    handleUpgradePlan,
    isSubmitting
  } = useWorkshopCreation();

  const {
    hasReachedSessionLimit,
    hasReachedFacilitatorLimit,
    maxSessions,
    currentSessionCount,
    isLoading: limitsLoading,
    planName
  } = usePlanLimits();

  const { currentPlanId } = useUserPlan();
  const { user } = useAuth();
  const onboardingMode = searchParams.get("onboarding");
  const isOnboardingDemo = onboardingMode === "demo";
  const isOnboardingInvite = onboardingMode === "invite";

  // Map a plan ID to its effective access tier for facilitator lock checks.
  // Mirrors the same logic in FacilitatorCarousel.tsx.
  const effectivePlanTier = (planId: number | null): number => {
    if (!planId) return 1;
    if (planId === 101) return 2; // AppSumo Solo → Starter
    if (planId === 102) return 2; // AppSumo Team → Starter
    if (planId === 103) return 3; // AppSumo Agency → Premium
    return planId;
  };

  const userTier = effectivePlanTier(currentPlanId);

  useEffect(() => {
    if (!isOnboardingDemo || hasAppliedOnboardingPreset) return;

    setParticipantCount(1);
    if (!description.trim()) {
      setDescription("Solo demo user exploring AIfacilitator before inviting real participants.");
    }
    setDurationMinutes(15);
    setHasAppliedOnboardingPreset(true);
  }, [description, hasAppliedOnboardingPreset, isOnboardingDemo, setDescription, setDurationMinutes, setParticipantCount]);

  // Don't render plan-dependent UI until data is loaded
  const planDataReady = !limitsLoading && maxSessions > 0;

  const {
    data: facilitators = [],
    isLoading: isFacilitatorsLoading
  } = useQuery({
    queryKey: ['facilitators'],
    queryFn: fetchFacilitators,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });


  const {
    data: upcomingScheduledSessions = [],
    isLoading: isUpcomingScheduledSessionsLoading,
  } = useQuery({
    queryKey: ['upcoming-scheduled-sessions', user?.id],
    queryFn: () => fetchUpcomingScheduledSessions(user?.id),
    enabled: currentStep === 1 && isClient && Boolean(user?.id),
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  const {
    data: rawWorkshops = [],
    isLoading: isWorkshopsLoading,
    refetch: refetchWorkshops
  } = useQuery({
    queryKey: ['workshops', selectedFacilitator],
    queryFn: () => fetchWorkshops(selectedFacilitator),
    enabled: currentStep === 2 && isClient,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Filter out workshops belonging to facilitators that are locked for the
  // current user's plan tier. The fetchWorkshops query returns the joined
  // facilitator row as `workshop.facilitator` (PostgREST alias). We cast it
  // to access plan_id and lock fields.
  const workshops = rawWorkshops.filter((workshop) => {
    const fac = workshop.facilitator as any;
    if (!fac || typeof fac !== 'object') return true; // no join data → show it
    const facPlanId: number | null = fac.plan_id ?? null;
    if (!facPlanId) return true; // no plan requirement → always accessible
    return facPlanId <= userTier; // only show if facilitator tier ≤ user tier
  });

  // Determine if steps should be disabled based on limits
  // Use hydration-safe defaults
  const isStep1Disabled = false; // Never disable selection of facilitators
  const isStep2Disabled = !selectedFacilitator; // Only disable if no facilitator selected
  const isStep3Disabled = !selectedWorkshop; // Only disable if no workshop selected

  // Only creation of new sessions should be blocked by session limit
  const isSubmitDisabled = hasReachedSessionLimit || !selectedWorkshop || !description.trim() || !agreed
    || (isScheduled && !scheduleValidation.isValid)
    || (durationMinutes !== "" && (Number(durationMinutes) < 5 || Number(durationMinutes) > 480));

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHead title="My Workshops" description="Choose your AI facilitator and create workshops" />
      <WelcomeModal
        isOpen={showWelcome && !hasSeenWelcome}
        onClose={() => { setHasSeenWelcome(true); setShowWelcome(false); }}
      />

      {/* CreateWorkshopModal managed at page level to always have the correct facilitatorId */}
      {selectedFacilitator !== null && (
        <CreateWorkshopModal
          open={isCreateWorkshopModalOpen}
          onOpenChange={setIsCreateWorkshopModalOpen}
          facilitatorId={selectedFacilitator}
          onSuccess={() => {
            setIsCreateWorkshopModalOpen(false);
            refetchWorkshops();
          }}
        />
      )}

      <div className="max-w-4xl mx-auto px-4 pt-24 pb-6">
        {/* Always render usage meter — shows skeleton while loading */}
        <div className="mb-6">
          {limitsLoading ? (
            <div className="h-20 rounded-2xl bg-gray-100 animate-pulse" />
          ) : (
            <UsageMeter
              currentUsage={currentSessionCount}
              limit={maxSessions}
              planName={planName}
              featureName="Sessions"
            />
          )}
        </div>

        {/* Referral programme banner — visible to all logged-in users */}
        <ReferralBanner />

        {isOnboardingDemo && (
          <div className="mb-6 rounded-2xl border border-purple-100 bg-purple-50 p-5 text-purple-900">
            <p className="font-semibold">Demo path: create a short AI workshop first</p>
            <p className="mt-1 text-sm leading-6">
              Select a facilitator, choose or create a workshop, then use the prefilled setup as a quick solo demo before inviting real participants.
            </p>
          </div>
        )}

        {isOnboardingInvite && (
          <div className="mb-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-5 text-emerald-900">
            <p className="font-semibold">Ready for real participants</p>
            <p className="mt-1 text-sm leading-6">
              Create or select a workshop here, then start or schedule the session and invite your participants.
            </p>
          </div>
        )}

        {!limitsLoading && (
          <PlanLimitAlert
            hasReachedSessionLimit={hasReachedSessionLimit}
            hasReachedFacilitatorLimit={hasReachedFacilitatorLimit}
            currentSessionCount={currentSessionCount}
            maxSessions={maxSessions}
            onUpgrade={handleUpgradePlan}
          />
        )}

        <div className="bg-white rounded-3xl shadow-lg p-4 md:p-6">
          <FacilitatorStepper
            currentStep={currentStep}
            setCurrentStep={setCurrentStep}
            isStep1Disabled={isStep1Disabled}
            isStep2Disabled={isStep2Disabled}
            isStep3Disabled={isStep3Disabled}
          />

          <div className="space-y-4 md:space-y-6">
            {/* Step 1: Facilitator Selection */}
            <div className={`transition-all ${currentStep === 1 ? 'block' : 'hidden'}`}>
              <FacilitatorSelection
                facilitators={facilitators}
                selectedFacilitator={selectedFacilitator}
                onSelect={setSelectedFacilitator}
                isLoading={isFacilitatorsLoading}
                upcomingScheduledSessions={upcomingScheduledSessions}
                isLoadingUpcomingSessions={isUpcomingScheduledSessionsLoading}
              />
            </div>

            {/* Step 2: Workshop Selection */}
            <div className={`transition-all ${currentStep === 2 ? 'block' : 'hidden'} ${!selectedFacilitator ? 'opacity-50 pointer-events-none' : ''}`}>
              <WorkshopSelection
                workshops={workshops}
                selectedWorkshop={selectedWorkshop}
                onSelect={setSelectedWorkshop}
                isLoading={isWorkshopsLoading}
                selectedFacilitatorId={selectedFacilitator}
                onAddNewWorkshop={() => setIsCreateWorkshopModalOpen(true)}
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
                durationMinutes={durationMinutes}
                setDurationMinutes={setDurationMinutes}
                defaultDurationMinutes={workshops.find(w => w.id === selectedWorkshop)?.duration_minutes ?? null}
                scheduledStartAt={scheduledStartAt}
                setScheduledStartAt={setScheduledStartAt}
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
            isSubmitting={isSubmitting}
            isScheduled={isScheduled}
          />
        </div>
      </div>
    </div>
  );
};

export default AIfacilitators;
