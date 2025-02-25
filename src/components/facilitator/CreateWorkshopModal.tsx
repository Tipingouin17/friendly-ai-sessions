
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

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
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const { error } = await supabase
        .from('sessions')
        .insert({
          title,
          scope,
          objective,
          profile_picture: profilePicture || undefined,
          facilitator: facilitatorId,
          status: true,
          lock: false
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Workshop created successfully",
      });
      
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating workshop:', error);
      toast({
        title: "Error",
        description: "Failed to create workshop",
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
          <DialogTitle>Create New Workshop</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter workshop title"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="scope">Scope</Label>
            <Textarea
              id="scope"
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              placeholder="Enter workshop scope"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="objective">Objective</Label>
            <Textarea
              id="objective"
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              placeholder="Enter workshop objective"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profilePicture">Workshop Image URL</Label>
            <Input
              id="profilePicture"
              value={profilePicture}
              onChange={(e) => setProfilePicture(e.target.value)}
              placeholder="Enter workshop image URL"
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
              Create Workshop
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
