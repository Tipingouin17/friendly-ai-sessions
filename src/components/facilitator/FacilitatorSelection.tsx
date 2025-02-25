
import { Plus } from "lucide-react";

interface Facilitator {
  id: number;
  name: string;
  avatar: string;
  description: string;
}

interface FacilitatorSelectionProps {
  facilitators: Facilitator[];
  selectedFacilitator: number | null;
  onSelect: (id: number) => void;
}

export const FacilitatorSelection = ({ facilitators, selectedFacilitator, onSelect }: FacilitatorSelectionProps) => {
  return (
    <div className="grid grid-cols-2 gap-4">
      {facilitators.map((facilitator) => (
        <div
          key={facilitator.id}
          className={`p-4 border rounded-xl cursor-pointer transition-all ${
            selectedFacilitator === facilitator.id ? 'border-primary' : 'border-gray-200'
          }`}
          onClick={() => onSelect(facilitator.id)}
        >
          <img src={facilitator.avatar} alt={facilitator.name} className="w-24 h-24 rounded-full mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">{facilitator.name}</h3>
          <p className="text-sm text-gray-600">{facilitator.description}</p>
        </div>
      ))}
      <div className="p-4 border border-dashed border-gray-300 rounded-xl flex items-center justify-center cursor-pointer hover:border-primary transition-all">
        <div className="text-center">
          <Plus className="w-12 h-12 mx-auto mb-2 text-gray-400" />
          <span className="text-sm text-gray-600">Add New Facilitator</span>
        </div>
      </div>
    </div>
  );
};
