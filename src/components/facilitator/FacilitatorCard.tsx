
import { Facilitator } from "@/types/facilitator";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { handleAvatarError } from "@/utils/facilitatorUtils";
import { Skeleton } from "@/components/ui/skeleton";
import { Lock } from "lucide-react";
import { useState, useEffect } from "react";
import { debugLog } from "@/utils/debugLogger";

interface FacilitatorCardProps {
  facilitator: Facilitator;
  isSelected: boolean;
  avatarUrl: string;
  onClick: () => void;
  isLoading?: boolean;
  isLocked?: boolean;
}

export const FacilitatorCard = ({ 
  facilitator, 
  isSelected, 
  avatarUrl, 
  onClick,
  isLoading = false,
  isLocked = false,
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
  
  if (isLocked) {
    return (
      <div
        className="flex w-1/4 shrink-0 cursor-pointer flex-col items-center rounded-xl border border-gray-200 p-4 transition-all relative opacity-60 hover:opacity-80"
        onClick={onClick}
        title="Upgrade your plan to access this facilitator"
      >
        {/* Lock overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-white/70 z-10">
          <Lock className="h-6 w-6 text-amber-500 mb-1" />
          <span className="text-xs font-semibold text-amber-600 text-center leading-tight px-1">Upgrade to unlock</span>
        </div>

        <div className="relative mb-4 h-20 w-20 overflow-hidden rounded-full grayscale">
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
          {!isClient && (
            <div className="flex h-full w-full items-center justify-center bg-gray-200 text-gray-600 text-xl font-medium">
              {facilitator.title?.charAt(0) || 'F'}
            </div>
          )}
        </div>
        <h3 className="text-center text-sm font-medium text-gray-400">{facilitator.title}</h3>
      </div>
    );
  }

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
