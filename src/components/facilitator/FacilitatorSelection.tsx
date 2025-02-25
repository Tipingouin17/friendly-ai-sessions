
import { Facilitator } from "@/types/facilitator";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Clock, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

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
  if (isLoading) {
    return <div>Loading facilitators...</div>;
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {facilitators.map((facilitator) => (
        <Card
          key={facilitator.id}
          className={`p-6 cursor-pointer transition-all hover:shadow-md ${
            selectedFacilitator === facilitator.id ? 'ring-2 ring-primary' : ''
          }`}
          onClick={() => onSelect(facilitator.id)}
        >
          <div className="flex items-start gap-4">
            <img
              src={facilitator.profile_picture}
              alt={facilitator.title}
              className="w-16 h-16 rounded-full object-cover"
            />
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-1">{facilitator.title}</h3>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                {facilitator.rating && (
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 stroke-yellow-400" />
                    <span>{facilitator.rating.toFixed(1)}</span>
                  </div>
                )}
                {facilitator.total_sessions && (
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{facilitator.total_sessions} sessions</span>
                  </div>
                )}
                {facilitator.last_active && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>Active {formatDistanceToNow(new Date(facilitator.last_active))} ago</span>
                  </div>
                )}
              </div>

              <p className="text-sm text-muted-foreground mb-3">
                {facilitator.description || facilitator.details}
              </p>

              <div className="flex flex-wrap gap-2">
                {facilitator.expertise_level && (
                  <Badge variant="secondary">
                    {facilitator.expertise_level}
                  </Badge>
                )}
                {facilitator.specialties?.map((specialty, index) => (
                  <Badge key={index} variant="outline">
                    {specialty}
                  </Badge>
                ))}
                {facilitator.languages?.map((language, index) => (
                  <Badge key={index} variant="outline" className="bg-primary/5">
                    {language}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};
