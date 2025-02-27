
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { useUserPlan } from "@/hooks/useUserPlan";

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
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [profilePicture, setProfilePicture] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const { plan } = useUserPlan();
  
  const { 
    hasReachedFacilitatorLimit, 
    maxFacilitators, 
    currentFacilitatorCount,
    canCreateCustomFacilitators,
    isLoading: limitsLoading
  } = usePlanLimits();

  const getUsagePercentage = () => {
    if (maxFacilitators === Infinity) return 0;
    return Math.min(100, (currentFacilitatorCount / maxFacilitators) * 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (hasReachedFacilitatorLimit || !canCreateCustomFacilitators) {
      toast({
        title: "Plan Restriction",
        description: canCreateCustomFacilitators 
          ? "You've reached your plan's facilitator limit. Please upgrade to create more facilitators."
          : "Your current plan doesn't allow creating custom facilitators. Please upgrade to enable this feature.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      
      const { error } = await supabase
        .from('facilitators')
        .insert({
          title,
          details,
          profile_picture: profilePicture || undefined,
          lock: false,
          user_id: user!.id,
          plan_id: plan?.id // Associate the facilitator with the current plan
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Facilitator created successfully",
      });
      
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating facilitator:', error);
      toast({
        title: "Error",
        description: "Failed to create facilitator",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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

  // Determine the error message based on the restriction reason
  const restrictionMessage = !canCreateCustomFacilitators
    ? "Your current plan doesn't allow creating custom facilitators."
    : `You've used ${currentFacilitatorCount} out of ${maxFacilitators} facilitators available in your plan.`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Facilitator</DialogTitle>
        </DialogHeader>
        
        {(hasReachedFacilitatorLimit || !canCreateCustomFacilitators) ? (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Plan Restriction</AlertTitle>
              <AlertDescription>
                {restrictionMessage} Please upgrade to {!canCreateCustomFacilitators ? "enable this feature" : "create more facilitators"}.
              </AlertDescription>
            </Alert>
            <Button onClick={handleUpgradePlan} className="w-full">
              Upgrade Plan
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="facilitator-limit">Facilitator Usage</Label>
                <span className="text-sm text-muted-foreground">
                  {currentFacilitatorCount} of {maxFacilitators === Infinity ? "Unlimited" : maxFacilitators}
                </span>
              </div>
              <Progress value={getUsagePercentage()} className="h-2" id="facilitator-limit" />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter facilitator title"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="details">Details</Label>
              <Textarea
                id="details"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Enter facilitator details"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profilePicture">Profile Picture URL</Label>
              <Input
                id="profilePicture"
                value={profilePicture}
                onChange={(e) => setProfilePicture(e.target.value)}
                placeholder="Enter profile picture URL"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                Create Facilitator
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
