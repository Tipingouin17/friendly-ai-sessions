
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
      
      // Create the facilitator entry first so we have an ID
      const { data: facilitator, error } = await supabase
        .from('facilitators')
        .insert({
          title,
          details,
          profile_picture: null, // We'll handle the profile picture separately
          lock: false,
          user_id: user!.id,
          plan_id: plan?.id // Associate the facilitator with the current plan
        })
        .select('id')
        .single();

      if (error) throw error;

      // If a profile picture is provided, upload it to the storage bucket
      if (profilePicture && facilitator) {
        console.log(`Uploading profile picture for facilitator ${facilitator.id}`);
        
        // Convert base64 to blob
        const base64Response = await fetch(profilePicture);
        const blob = await base64Response.blob();
        
        // IMPORTANT: MUST use 'facilitator-avatars' as the bucket name consistently across the app
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('facilitator-avatars')
          .upload(`${facilitator.id}.jpg`, blob, {
            contentType: 'image/jpeg',
            upsert: true
          });
        
        console.log("Upload result:", uploadData);
        
        if (uploadError) {
          console.error('Error uploading profile picture:', uploadError);
          toast({
            title: "Warning",
            description: "Facilitator created but profile picture could not be uploaded",
            variant: "destructive",
          });
        } else {
          // Get the public URL - ensure we use the correct bucket name
          const { data: publicUrlData } = supabase.storage
            .from('facilitator-avatars')
            .getPublicUrl(`${facilitator.id}.jpg`);
            
          console.log("Public URL:", publicUrlData.publicUrl);
          
          // Update the facilitator with the profile picture URL
          const { error: updateError } = await supabase
            .from('facilitators')
            .update({
              profile_picture: publicUrlData.publicUrl
            })
            .eq('id', facilitator.id);
            
          if (updateError) {
            console.error('Error updating facilitator with profile picture URL:', updateError);
          }
        }
      }

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
