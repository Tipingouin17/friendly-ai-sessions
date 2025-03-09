
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { useNavigate } from "react-router-dom";
import { PlanLimitWarning } from "./PlanLimitWarning";
import { FacilitatorForm } from "./FacilitatorForm";
import { useFacilitatorCreation } from "@/hooks/useFacilitatorCreation";

interface CreateFacilitatorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const CreateFacilitatorModal = ({
  open,
  onOpenChange,
  onSuccess
}: CreateFacilitatorModalProps) => {
  const navigate = useNavigate();
  
  const { 
    hasReachedFacilitatorLimit, 
    maxFacilitators, 
    currentFacilitatorCount,
    canCreateCustomFacilitators,
    isLoading: limitsLoading
  } = usePlanLimits();

  const {
    title,
    setTitle,
    details,
    setDetails,
    profilePicture,
    setProfilePicture,
    isLoading,
    createFacilitator
  } = useFacilitatorCreation(onSuccess);

  const handleSubmit = async (e: React.FormEvent) => {
    const success = await createFacilitator(e, hasReachedFacilitatorLimit, canCreateCustomFacilitators);
    if (success) {
      onOpenChange(false);
    }
  };

  const handleUpgradePlan = () => {
    onOpenChange(false);
    navigate('/pricing');
  };

  if (limitsLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Loading...</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Facilitator</DialogTitle>
        </DialogHeader>
        
        {(hasReachedFacilitatorLimit || !canCreateCustomFacilitators) ? (
          <PlanLimitWarning
            canCreateCustomFacilitators={canCreateCustomFacilitators}
            currentFacilitatorCount={currentFacilitatorCount}
            maxFacilitators={maxFacilitators}
            onUpgrade={handleUpgradePlan}
          />
        ) : (
          <FacilitatorForm
            title={title}
            setTitle={setTitle}
            details={details}
            setDetails={setDetails}
            profilePicture={profilePicture}
            setProfilePicture={setProfilePicture}
            currentFacilitatorCount={currentFacilitatorCount}
            maxFacilitators={maxFacilitators}
            isLoading={isLoading}
            onCancel={() => onOpenChange(false)}
            onSubmit={handleSubmit}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
