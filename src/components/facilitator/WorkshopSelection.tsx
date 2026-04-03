import { ChevronLeft, ChevronRight, Plus, BookOpen, GraduationCap, Brain, Puzzle, Microscope } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Workshop } from "@/types/facilitator";

interface WorkshopSelectionProps {
  workshops: Workshop[];
  selectedWorkshop: number | null;
  onSelect: (id: number) => void;
  isLoading?: boolean;
  selectedFacilitatorId?: number | null;
  onAddNewWorkshop: () => void;
}

const iconMap = {
  'book-open': BookOpen,
  'graduation-cap': GraduationCap,
  'brain': Brain,
  'puzzle': Puzzle,
  'microscope': Microscope
};

export const WorkshopSelection = ({ 
  workshops, 
  selectedWorkshop, 
  onSelect,
  isLoading = false,
  onAddNewWorkshop
}: WorkshopSelectionProps) => {
  const [startIndex, setStartIndex] = useState(0);
  const itemsToShow = 4;

  // Total items = workshops + 1 "Add New Workshop" card
  const totalItems = workshops.length + 1;
  const maxStartIndex = Math.max(0, totalItems - itemsToShow);

  const handlePrevious = () => {
    setStartIndex(Math.max(0, startIndex - 1));
  };

  const handleNext = () => {
    setStartIndex(Math.min(maxStartIndex, startIndex + 1));
  };

  const getIcon = (iconType: string = 'book-open') => {
    const IconComponent = iconMap[iconType as keyof typeof iconMap] || BookOpen;
    return <IconComponent className="w-12 h-12 text-primary" />;
  };

  if (isLoading) {
    return <div>Loading workshops...</div>;
  }

  // Build the list of items to display: workshops + Add New Workshop card
  // We treat "Add New Workshop" as item at index workshops.length
  const visibleItems = [];
  for (let i = startIndex; i < startIndex + itemsToShow && i < totalItems; i++) {
    if (i < workshops.length) {
      visibleItems.push({ type: 'workshop' as const, workshop: workshops[i] });
    } else {
      visibleItems.push({ type: 'add-new' as const, workshop: null });
    }
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

        <div className="mx-12 grid grid-cols-4 gap-4 w-full">
          {visibleItems.map((item) => 
            item.type === 'workshop' && item.workshop ? (
              <div
                key={item.workshop.id}
                className={`flex cursor-pointer flex-col items-center rounded-xl border p-6 transition-all ${
                  selectedWorkshop === item.workshop.id ? 'border-primary' : 'border-gray-200'
                }`}
                onClick={() => onSelect(item.workshop!.id)}
              >
                <div className="mb-4">
                  {getIcon(item.workshop.icon_type)}
                </div>
                <h3 className="text-center text-lg font-semibold leading-tight">{item.workshop.title}</h3>
              </div>
            ) : (
              <div 
                key="add-new"
                className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 p-6 hover:border-primary transition-all"
                onClick={onAddNewWorkshop}
              >
                <Plus className="mb-2 h-12 w-12 text-gray-400" />
                <span className="text-center text-sm text-gray-600">Add New Workshop</span>
              </div>
            )
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="absolute right-0 z-10 translate-x-1/2"
          onClick={handleNext}
          disabled={startIndex >= maxStartIndex}
        >
          <ChevronRight className="h-6 w-6" />
        </Button>
      </div>

      {selectedWorkshop && (
        <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <h3 className="mb-2 text-lg font-semibold">
            {workshops.find(w => w.id === selectedWorkshop)?.title}
          </h3>
          <div className="space-y-4">
            <div>
              <span className="font-semibold">Scope:</span>
              <p className="text-gray-600">
                {workshops.find(w => w.id === selectedWorkshop)?.scope}
              </p>
            </div>
            <div>
              <span className="font-semibold">Objective:</span>
              <p className="text-gray-600">
                {workshops.find(w => w.id === selectedWorkshop)?.objective}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
