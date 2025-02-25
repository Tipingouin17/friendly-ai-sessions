
import { Workshop } from "@/types/facilitator";
import { Card } from "@/components/ui/card";

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
  if (isLoading) {
    return <div>Loading workshops...</div>;
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {workshops.map((workshop) => (
        <Card
          key={workshop.id}
          className={`p-6 cursor-pointer transition-all ${
            selectedWorkshop === workshop.id ? 'ring-2 ring-primary' : 'hover:border-primary'
          }`}
          onClick={() => onSelect(workshop.id)}
        >
          <h3 className="text-xl font-semibold mb-2">{workshop.title}</h3>
          <p className="text-muted-foreground mb-4">{workshop.scope}</p>
          <div className="text-sm">
            <strong>Objective:</strong> {workshop.objective}
          </div>
        </Card>
      ))}
    </div>
  );
};
