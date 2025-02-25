
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Workshop } from "@/types/facilitator";

interface WorkshopSelectionProps {
  workshops: Workshop[];
  selectedWorkshop: number | null;
  onSelect: (id: number) => void;
  isLoading?: boolean;
}

export const WorkshopSelection = ({ 
  workshops, 
  selectedWorkshop, 
  onSelect,
  isLoading = false 
}: WorkshopSelectionProps) => {
  const [startIndex, setStartIndex] = useState(0);
  const itemsToShow = 4;

  const handlePrevious = () => {
    setStartIndex(Math.max(0, startIndex - 1));
  };

  const handleNext = () => {
    setStartIndex(Math.min(workshops.length - itemsToShow, startIndex + 1));
  };

  if (isLoading) {
    return <div>Loading workshops...</div>;
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
          {workshops.slice(startIndex, startIndex + itemsToShow).map((workshop) => (
            <div
              key={workshop.id}
              className={`w-1/4 shrink-0 cursor-pointer rounded-xl border p-4 transition-all ${
                selectedWorkshop === workshop.id ? 'border-primary' : 'border-gray-200'
              }`}
              onClick={() => onSelect(workshop.id)}
            >
              <div className="mb-4">
                {workshop.profile_picture ? (
                  <img src={workshop.profile_picture} alt={workshop.title} className="w-16 h-16 mx-auto" />
                ) : (
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    🎯
                  </div>
                )}
              </div>
              <h3 className="mb-2 text-lg font-semibold">{workshop.title}</h3>
              <div className="space-y-2">
                <div>
                  <span className="font-semibold">Scope:</span>
                  <p className="text-sm text-gray-600">{workshop.scope}</p>
                </div>
                <div>
                  <span className="font-semibold">Objective:</span>
                  <p className="text-sm text-gray-600">{workshop.objective}</p>
                </div>
              </div>
            </div>
          ))}
          {startIndex + itemsToShow >= workshops.length && (
            <div className="flex w-1/4 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-dashed border-gray-300 p-4 hover:border-primary transition-all">
              <div className="text-center">
                <Plus className="mx-auto mb-2 h-12 w-12 text-gray-400" />
                <span className="text-sm text-gray-600">Add New Workshop</span>
              </div>
            </div>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="absolute right-0 z-10 translate-x-1/2"
          onClick={handleNext}
          disabled={startIndex >= workshops.length - itemsToShow}
        >
          <ChevronRight className="h-6 w-6" />
        </Button>
      </div>
      {selectedWorkshop && (
        <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <h3 className="mb-2 text-lg font-semibold">
            {workshops.find(w => w.id === selectedWorkshop)?.title}
          </h3>
          <p className="text-gray-600">
            {workshops.find(w => w.id === selectedWorkshop)?.objective}
          </p>
        </div>
      )}
    </div>
  );
};
