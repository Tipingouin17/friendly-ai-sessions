/**
 * Facilitator Details Panel
 *
 * Facilitator component for the AIfacilitator application.
 */

import { Facilitator } from "@/types/facilitator";

interface FacilitatorDetailsPanelProps {
  selectedFacilitator: number | null;
  facilitators: Facilitator[];
}

export const FacilitatorDetailsPanel = ({ 
  selectedFacilitator, 
  facilitators 
}: FacilitatorDetailsPanelProps) => {
  if (!selectedFacilitator) return null;
  
  const facilitator = facilitators.find(f => f.id === selectedFacilitator);
  
  return (
    <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-4">
      <h3 className="mb-2 text-lg font-semibold">
        {facilitator?.title}
      </h3>
      <p className="text-gray-600">
        {facilitator?.details}
      </p>
    </div>
  );
};
