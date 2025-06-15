
import { Facilitator } from "@/types/facilitator";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { handleAvatarError } from "@/utils/facilitatorUtils";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";
import { debugLog } from "@/utils/debugLogger";

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
  const [isClient, setIsClient] = useState(false);
  
  // Hydration-safe client detection
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // Display a placeholder if the URL is empty or we're on server
  const displayUrl = (isClient && avatarUrl) ? avatarUrl : '/placeholder.svg';
  
  // Add debugging to see what URLs we're getting (only on client)
  useEffect(() => {
    if (isClient) {
      debugLog('all', `FacilitatorCard - Displaying avatar for ${facilitator.title}: ${displayUrl}`);
    }
  }, [displayUrl, facilitator.title, isClient]);
  
  return (
    <div
      className={`flex w-1/4 shrink-0 cursor-pointer flex-col items-center rounded-xl border p-4 transition-all ${
        isSelected ? 'border-primary bg-primary/5' : 'border-gray-200 hover:bg-gray-50'
      }`}
      onClick={onClick}
    >
      <div className="relative mb-4 h-20 w-20 overflow-hidden rounded-full">
        {(isLoading || imageLoading || !isClient) ? (
          <Skeleton className="absolute inset-0 h-full w-full rounded-full" />
        ) : null}
        
        {isClient && (
          <Avatar className="h-full w-full">
            <AvatarImage 
              src={displayUrl} 
              alt={facilitator.title || 'Facilitator'} 
              onError={handleAvatarError}
              onLoad={() => setImageLoading(false)}
              className="h-full w-full object-cover"
              crossOrigin="anonymous"
            />
            <AvatarFallback delayMs={600}>
              {facilitator.title?.charAt(0) || 'F'}
            </AvatarFallback>
          </Avatar>
        )}
        
        {/* Server-side rendering fallback */}
        {!isClient && (
          <div className="flex h-full w-full items-center justify-center bg-gray-200 text-gray-600 text-xl font-medium">
            {facilitator.title?.charAt(0) || 'F'}
          </div>
        )}
      </div>
      <h3 className="text-center text-sm font-medium">{facilitator.title}</h3>
    </div>
  );
};
