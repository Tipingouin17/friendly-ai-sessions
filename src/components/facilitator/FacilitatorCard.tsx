
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
  
  // Display a placeholder if the URL is empty
  const displayUrl = avatarUrl || '/placeholder.svg';
  
  return (
    <div
      className={`flex w-1/4 shrink-0 cursor-pointer flex-col items-center rounded-xl border p-4 transition-all ${
        isSelected ? 'border-primary bg-primary/5' : 'border-gray-200 hover:bg-gray-50'
      }`}
      onClick={onClick}
    >
      <div className="relative mb-4 h-20 w-20 overflow-hidden rounded-full">
        {(isLoading || imageLoading) ? (
          <Skeleton className="absolute inset-0 h-full w-full rounded-full" />
        ) : null}
        
        <Avatar className="h-full w-full">
          <AvatarImage 
            src={displayUrl} 
            alt={facilitator.title || 'Facilitator'} 
            onError={handleAvatarError}
            onLoad={() => setImageLoading(false)}
            className="h-full w-full object-cover"
          />
          <AvatarFallback delayMs={600}>
            {facilitator.title?.charAt(0) || 'F'}
          </AvatarFallback>
        </Avatar>
      </div>
      <h3 className="text-center text-sm font-medium">{facilitator.title}</h3>
    </div>
  );
};
