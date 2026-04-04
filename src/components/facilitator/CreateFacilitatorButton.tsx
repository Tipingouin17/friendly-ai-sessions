/**
 * Create Facilitator Button
 *
 * Facilitator component for the AIfacilitator application.
 */

import { Plus, Lock } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface CreateFacilitatorButtonProps {
  hasReachedFacilitatorLimit: boolean;
  canCreateCustomFacilitators: boolean;
  maxFacilitators: number;
  onClick: () => void;
}

export const CreateFacilitatorButton = ({
  hasReachedFacilitatorLimit,
  canCreateCustomFacilitators,
  maxFacilitators,
  onClick
}: CreateFacilitatorButtonProps) => {
  if (canCreateCustomFacilitators) {
    return (
      <div 
        className={`flex w-full cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 p-6 hover:border-primary transition-all ${
          hasReachedFacilitatorLimit ? 'opacity-50 cursor-not-allowed' : ''
        }`}
        onClick={() => !hasReachedFacilitatorLimit && onClick()}
      >
        <Plus className="mb-2 h-12 w-12 text-gray-400" />
        <span className="text-center text-sm text-gray-600">
          {hasReachedFacilitatorLimit 
            ? `Limited to ${maxFacilitators} facilitators` 
            : "Add New Facilitator"}
        </span>
      </div>
    );
  }
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex w-full flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 p-6 opacity-50 cursor-not-allowed">
            <div className="relative">
              <Plus className="mb-2 h-12 w-12 text-gray-400" />
              <Lock className="absolute top-0 right-0 h-6 w-6 text-gray-500 transform translate-x-1/4 -translate-y-1/4" />
            </div>
            <span className="text-center text-sm text-gray-600">
              Custom Facilitators Locked
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Upgrade your plan to create custom facilitators.</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
