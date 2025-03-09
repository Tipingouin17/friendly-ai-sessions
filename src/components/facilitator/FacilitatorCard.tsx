
import { Facilitator } from "@/types/facilitator";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { handleAvatarError } from "@/utils/facilitatorUtils";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";

interface FacilitatorCardProps {
  facilitator: Facilitator;
  isSelected: boolean;
  avatarUrl: string;
  onClick: () => void;
  isLoading?: boolean;
}

export const FacilitatorCard = ({ 
  facilitator, 
  isSelected, 
  avatarUrl, 
  onClick,
  isLoading = false
}: FacilitatorCardProps) => {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setImageError(true);
    handleAvatarError(e);
  };
  
  return (
    <div
      className={`flex w-1/4 shrink-0 cursor-pointer flex-col items-center rounded-xl border p-6 transition-all ${
        isSelected ? 'border-primary' : 'border-gray-200'
      }`}
      onClick={onClick}
    >
      <div className="relative mb-4 h-24 w-24 rounded-full overflow-hidden flex items-center justify-center bg-gray-100">
        {(isLoading || imageLoading) && <Skeleton className="absolute inset-0 z-10 bg-gray-200" />}
        <Avatar className="h-full w-full">
          <AvatarImage 
            src={avatarUrl} 
            alt={facilitator.title || 'Facilitator'} 
            onError={handleImageError}
            onLoad={() => setImageLoading(false)}
            className="object-cover"
          />
          <AvatarFallback>{facilitator.title?.charAt(0) || 'F'}</AvatarFallback>
        </Avatar>
      </div>
      <h3 className="text-center text-lg font-semibold leading-tight">{facilitator.title}</h3>
    </div>
  );
};
