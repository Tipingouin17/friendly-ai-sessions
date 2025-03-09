
import { Facilitator } from "@/types/facilitator";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { handleAvatarError } from "@/utils/facilitatorUtils";

interface FacilitatorCardProps {
  facilitator: Facilitator;
  isSelected: boolean;
  avatarUrl: string;
  onClick: () => void;
}

export const FacilitatorCard = ({ 
  facilitator, 
  isSelected, 
  avatarUrl, 
  onClick 
}: FacilitatorCardProps) => {
  return (
    <div
      className={`flex w-1/4 shrink-0 cursor-pointer flex-col items-center rounded-xl border p-6 transition-all ${
        isSelected ? 'border-primary' : 'border-gray-200'
      }`}
      onClick={onClick}
    >
      <div className="mb-4 h-24 w-24 rounded-full overflow-hidden flex items-center justify-center bg-gray-100">
        <Avatar className="h-full w-full">
          <AvatarImage 
            src={avatarUrl} 
            alt={facilitator.title || 'Facilitator'} 
            onError={handleAvatarError}
          />
          <AvatarFallback>{facilitator.title?.charAt(0) || 'F'}</AvatarFallback>
        </Avatar>
      </div>
      <h3 className="text-center text-lg font-semibold leading-tight">{facilitator.title}</h3>
    </div>
  );
};
