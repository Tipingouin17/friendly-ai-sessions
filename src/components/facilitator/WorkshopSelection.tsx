/**
 * Workshop Selection
 *
 * Facilitator component for the AIfacilitator application.
 */
import { ChevronLeft, ChevronRight, Plus, BookOpen, GraduationCap, Brain, Puzzle, Microscope, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePlanLimits } from "@/hooks/usePlanLimits";
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
  const { canCreateCustomSessions } = usePlanLimits();
  const [startIndex, setStartIndex] = useState(0);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Responsive: 2 items on xs (<480px), 3 on sm, 4 on md+
  const itemsToShow = windowWidth < 480 ? 2 : windowWidth < 768 ? 3 : 4;

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
    <div>
      <div className="flex items-center gap-1">
        {/* Prev button — stays inside the card boundary on all screen sizes */}
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 h-8 w-8"
          onClick={handlePrevious}
          disabled={startIndex === 0}
          aria-label="Previous workshops"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        {/* Responsive grid: 2 cols on xs, 3 on sm, 4 on md+ */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 flex-1">
          {visibleItems.map((item) => 
            item.type === 'workshop' && item.workshop ? (
              <div
                key={item.workshop.id}
                className={`flex cursor-pointer flex-col items-center rounded-xl border p-4 transition-all ${
                  selectedWorkshop === item.workshop.id ? 'border-primary bg-primary/5' : 'border-gray-200 hover:bg-gray-50'
                }`}
                onClick={() => onSelect(item.workshop!.id)}
              >
                <div className="mb-3">
                  {getIcon(item.workshop.icon_type)}
                </div>
                <h3 className="text-center text-sm font-semibold leading-tight">{item.workshop.title}</h3>
              </div>
            ) : (
              <div 
                key="add-new"
                className="relative flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 p-4 hover:border-primary transition-all min-h-[100px]"
                onClick={onAddNewWorkshop}
              >
                {!canCreateCustomSessions && (
                  <Badge
                    className="absolute -top-2 -right-2 flex items-center gap-0.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[10px] px-1.5 py-0.5 shadow-sm border-0"
                  >
                    <Sparkles className="h-2.5 w-2.5" />
                    Pro
                  </Badge>
                )}
                <Plus className="mb-2 h-8 w-8 text-gray-400" />
                <span className="text-center text-xs text-gray-600">Add New Workshop</span>
              </div>
            )
          )}
        </div>

        {/* Next button — stays inside the card boundary on all screen sizes */}
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 h-8 w-8"
          onClick={handleNext}
          disabled={startIndex >= maxStartIndex}
          aria-label="Next workshops"
        >
          <ChevronRight className="h-5 w-5" />
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
