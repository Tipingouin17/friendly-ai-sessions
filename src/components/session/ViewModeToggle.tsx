
import React from 'react';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Eye, Users } from "lucide-react";

interface ViewModeToggleProps {
  viewMode: "participant" | "admin";
  setViewMode: (mode: "participant" | "admin") => void;
  isAdmin: boolean;
}

const ViewModeToggle = ({ viewMode, setViewMode, isAdmin }: ViewModeToggleProps) => {
  // Always return null - we're only showing admin view now
  return null;
};

export default ViewModeToggle;
