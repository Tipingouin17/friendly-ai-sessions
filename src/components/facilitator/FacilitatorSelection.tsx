
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Facilitator } from "@/types/facilitator";
import { CreateFacilitatorModal } from "./CreateFacilitatorModal";

interface FacilitatorSelectionProps {
  facilitators: Facilitator[];
  selectedFacilitator: number | null;
  onSelect: (id: number) => void;
  isLoading?: boolean;
}

export const FacilitatorSelection = ({ 
  facilitators, 
  selectedFacilitator, 
  onSelect,
  isLoading = false 
}: FacilitatorSelectionProps) => {
  const [startIndex, setStartIndex] = useState(0);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const itemsToShow = 4;

  const handlePrevious = () => {
    setStartIndex(Math.max(0, startIndex - 1));
  };

  const handleNext = () => {
    setStartIndex(Math.min(facilitators.length - itemsToShow, startIndex + 1));
  };

  if (isLoading) {
    return <div>Loading facilitators...</div>;
  }

  return (
    <div className="relative">
      <div className="flex items-center">
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-0 z-10 -translate-x-1/2"
          onClick={handlePrevious}
          disabled={startIndex === 0}
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>

        <div className="mx-12 flex gap-4 overflow-hidden">
          {facilitators.slice(startIndex, startIndex + itemsToShow).map((facilitator) => (
            <div
              key={facilitator.id}
              className={`flex w-1/4 shrink-0 cursor-pointer flex-col items-center rounded-xl border p-6 transition-all ${
                selectedFacilitator === facilitator.id ? 'border-primary' : 'border-gray-200'
              }`}
              onClick={() => onSelect(facilitator.id)}
            >
              <img 
                src={facilitator.profile_picture} 
                alt={facilitator.title} 
                className="mb-4 h-24 w-24 rounded-full" 
              />
              <h3 className="text-center text-lg font-semibold leading-tight">{facilitator.title}</h3>
            </div>
          ))}
          <div 
            className="flex w-1/4 shrink-0 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 p-6 hover:border-primary transition-all"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus className="mb-2 h-12 w-12 text-gray-400" />
            <span className="text-center text-sm text-gray-600">Add New Facilitator</span>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="absolute right-0 z-10 translate-x-1/2"
          onClick={handleNext}
          disabled={startIndex >= facilitators.length - itemsToShow}
        >
          <ChevronRight className="h-6 w-6" />
        </Button>
      </div>
      {selectedFacilitator && (
        <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <h3 className="mb-2 text-lg font-semibold">
            {facilitators.find(f => f.id === selectedFacilitator)?.title}
          </h3>
          <p className="text-gray-600">
            {facilitators.find(f => f.id === selectedFacilitator)?.details}
          </p>
        </div>
      )}

      <CreateFacilitatorModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSuccess={() => {
          window.location.reload();
        }}
      />
    </div>
  );
};
