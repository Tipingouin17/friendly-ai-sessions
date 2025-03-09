
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

interface FacilitatorFormProps {
  title: string;
  setTitle: (title: string) => void;
  details: string;
  setDetails: (details: string) => void;
  profilePicture: string;
  setProfilePicture: (url: string) => void;
  currentFacilitatorCount: number;
  maxFacilitators: number | typeof Infinity;
  isLoading: boolean;
  onCancel: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const FacilitatorForm = ({
  title,
  setTitle,
  details,
  setDetails,
  profilePicture,
  setProfilePicture,
  currentFacilitatorCount,
  maxFacilitators,
  isLoading,
  onCancel,
  onSubmit
}: FacilitatorFormProps) => {
  const getUsagePercentage = () => {
    if (maxFacilitators === Infinity) return 0;
    return Math.min(100, (currentFacilitatorCount / (maxFacilitators as number)) * 100);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
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
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          Create Facilitator
        </Button>
      </div>
    </form>
  );
};
