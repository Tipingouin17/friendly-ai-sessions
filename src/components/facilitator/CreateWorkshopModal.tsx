/**
 * Create Workshop Modal
 *
 * Facilitator component for the AIfacilitator application.
 */

import { useState, useRef, useEffect } from "react";
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

interface CreateWorkshopModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facilitatorId: number;
  onSuccess: () => void;
}

export const CreateWorkshopModal = ({
  open,
  onOpenChange,
  facilitatorId,
  onSuccess
}: CreateWorkshopModalProps) => {
  const [title, setTitle] = useState("");
  const [scope, setScope] = useState("");
  const [objective, setObjective] = useState("");
  const [profilePicture, setProfilePicture] = useState("");
  const [durationMinutes, setDurationMinutes] = useState<number | "">("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  // Use a ref to always have the latest facilitatorId value in handleCreate
  const facilitatorIdRef = useRef(facilitatorId);
  useEffect(() => {
    facilitatorIdRef.current = facilitatorId;
  }, [facilitatorId]);
  
  const { 
    canCreateCustomSessions,
    isLoading: limitsLoading
  } = usePlanLimits();

  const handleCreate = async () => {
    if (!title.trim() || !scope.trim() || !objective.trim()) {
      toast({
        title: "Missing Fields",
        description: "Please fill in the title, scope, and objective.",
        variant: "destructive",
      });
      return;
    }

    if (!canCreateCustomSessions) {
      toast({
        title: "Feature Not Available",
        description: "Custom session creation is not available in your current plan. Please upgrade to create custom sessions.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Get the current user's ID via the Supabase auth session (not localStorage)
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast({
          title: "Authentication Error",
          description: "You must be logged in to create a workshop.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('sessions')
        .insert({
          title: title.trim(),
          scope: scope.trim(),
          objective: objective.trim(),
          icon_type: profilePicture.trim() || 'book-open',
          facilitator: facilitatorIdRef.current,
          status: true,
          lock: false,
          user_id: user.id,
          ...(durationMinutes !== "" ? { duration_minutes: Number(durationMinutes) } : {}),
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Workshop created successfully",
      });
      
      // Reset form
      setTitle("");
      setScope("");
      setObjective("");
      setProfilePicture("");
      setDurationMinutes("");

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating workshop:', error);
      toast({
        title: "Error",
        description: "Failed to create workshop. Please try again.",
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
        <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Loading...</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Workshop</DialogTitle>
        </DialogHeader>
        
        {!canCreateCustomSessions ? (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Feature Not Available</AlertTitle>
              <AlertDescription>
                Custom workshop creation is not available in your current plan. 
                Please upgrade to a plan that includes customizable sessions.
              </AlertDescription>
            </Alert>
            <Button onClick={handleUpgradePlan} className="w-full">
              Upgrade Plan
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ws-title">Title</Label>
              <Input
                id="ws-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter workshop title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ws-scope">Scope</Label>
              <Textarea
                id="ws-scope"
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                placeholder="Enter workshop scope"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ws-objective">Objective</Label>
              <Textarea
                id="ws-objective"
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                placeholder="Enter workshop objective"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ws-duration">Session Duration (minutes)</Label>
              <Input
                id="ws-duration"
                type="number"
                min={5}
                max={480}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="e.g. 60 (optional)"
              />
              <p className="text-xs text-muted-foreground">The AI facilitator will start wrapping up 10 minutes before the end.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ws-image">Workshop Icon Type</Label>
              <Input
                id="ws-image"
                value={profilePicture}
                onChange={(e) => setProfilePicture(e.target.value)}
                placeholder="e.g. book-open, star, zap (optional)"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleCreate}
                disabled={isLoading}
              >
                {isLoading ? "Creating..." : "Create Workshop"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
