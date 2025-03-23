
import { Facilitator } from "@/types/facilitator";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { handleAvatarError } from "@/utils/facilitatorUtils";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";

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
  
  useEffect(() => {
    // Reset loading state when avatarUrl changes
    if (avatarUrl) {
      setImageLoading(true);
      setImageError(false);
    }
  }, [avatarUrl]);
  
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    console.error(`Image error for facilitator ${facilitator.id} with URL ${avatarUrl}`);
    setImageError(true);
    setImageLoading(false);
    handleAvatarError(e);
  };
  
  const handleImageLoad = () => {
    console.log(`Image loaded successfully for facilitator ${facilitator.id}`);
    setImageLoading(false);
  };
  
  return (
    <div
      className={`flex w-1/4 shrink-0 cursor-pointer flex-col items-center rounded-xl border p-4 transition-all ${
        isSelected ? 'border-primary bg-primary/5' : 'border-gray-200 hover:bg-gray-50'
      }`}
      onClick={onClick}
    >
      <div className="relative mb-4 h-20 w-20 overflow-hidden rounded-full">
        {(isLoading || imageLoading) && !imageError ? (
          <Skeleton className="absolute inset-0 h-full w-full rounded-full" />
        ) : (
          <Avatar className="h-full w-full">
            <AvatarImage 
              src={avatarUrl} 
              alt={facilitator.title || 'Facilitator'} 
              onError={handleImageError}
              onLoad={handleImageLoad}
              className="h-full w-full object-cover"
            />
            <AvatarFallback delayMs={600}>
              {facilitator.title?.charAt(0) || 'F'}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
      <h3 className="text-center text-sm font-medium">{facilitator.title}</h3>
    </div>
  );
};
