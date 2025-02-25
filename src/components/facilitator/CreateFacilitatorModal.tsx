
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const { error } = await supabase
        .from('facilitators')
        .insert({
          title,
          details,
          profile_picture: profilePicture || undefined,
          lock: false
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Facilitator</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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
      </DialogContent>
    </Dialog>
  );
};
