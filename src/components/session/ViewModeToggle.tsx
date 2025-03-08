
import React from 'react';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Eye, Users } from "lucide-react";

interface ViewModeToggleProps {
  viewMode: "participant" | "admin";
  setViewMode: (mode: "participant" | "admin") => void;
  isAdmin: boolean;
}

const ViewModeToggle = ({ viewMode, setViewMode, isAdmin }: ViewModeToggleProps) => {
  // If not admin, don't show the toggle
  if (!isAdmin) return null;
  
  return (
    <div className="px-4 py-2 border-b border-gray-100 flex justify-end">
      <ToggleGroup 
        type="single" 
        value={viewMode}
        onValueChange={(value) => {
          if (value) setViewMode(value as "participant" | "admin");
        }}
        size="sm"
      >
        <ToggleGroupItem value="participant" aria-label="Participant view">
          <Eye className="h-4 w-4 mr-2" />
          <span className="text-sm">Participant</span>
        </ToggleGroupItem>
        <ToggleGroupItem value="admin" aria-label="Admin view">
          <Users className="h-4 w-4 mr-2" />
          <span className="text-sm">Admin</span>
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
};

export default ViewModeToggle;
