
import { Plus } from "lucide-react";

interface Workshop {
  id: number;
  title: string;
  icon: string;
  scope: string;
  objective: string;
}

interface WorkshopSelectionProps {
  workshops: Workshop[];
  selectedWorkshop: number | null;
  onSelect: (id: number) => void;
}

export const WorkshopSelection = ({ workshops, selectedWorkshop, onSelect }: WorkshopSelectionProps) => {
  return (
    <div className="grid grid-cols-2 gap-4">
      {workshops.map((workshop) => (
        <div
          key={workshop.id}
          className={`p-4 border rounded-xl cursor-pointer transition-all ${
            selectedWorkshop === workshop.id ? 'border-primary' : 'border-gray-200'
          }`}
          onClick={() => onSelect(workshop.id)}
        >
          <div className="text-4xl mb-4">{workshop.icon}</div>
          <h3 className="text-lg font-semibold mb-2">{workshop.title}</h3>
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
      <div className="p-4 border border-dashed border-gray-300 rounded-xl flex items-center justify-center cursor-pointer hover:border-primary transition-all">
        <div className="text-center">
          <Plus className="w-12 h-12 mx-auto mb-2 text-gray-400" />
          <span className="text-sm text-gray-600">Add New Workshop</span>
        </div>
      </div>
    </div>
  );
};
