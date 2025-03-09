
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useUserPlan } from "@/hooks/useUserPlan";

export const useFacilitatorCreation = (onSuccess: () => void) => {
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [profilePicture, setProfilePicture] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { plan } = useUserPlan();

  const createFacilitator = async (e: React.FormEvent, hasReachedFacilitatorLimit: boolean, canCreateCustomFacilitators: boolean) => {
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
      return true;
    } catch (error) {
      console.error('Error creating facilitator:', error);
      toast({
        title: "Error",
        description: "Failed to create facilitator",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    title,
    setTitle,
    details,
    setDetails,
    profilePicture,
    setProfilePicture,
    isLoading,
    createFacilitator
  };
};
