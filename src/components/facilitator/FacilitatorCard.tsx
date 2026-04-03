/**
 * Facilitator Card
 *
 * Displays a single facilitator avatar and name in the selection carousel.
 * Handles locked (plan-gated) facilitators with an overlay.
 */

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
  
  // Hydration-safe: only render images on the client to avoid SSR mismatches
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // Fall back to placeholder when no URL is available or during SSR
  const displayUrl = (isClient && avatarUrl) ? avatarUrl : '/placeholder.svg';
  
  useEffect(() => {
    if (isClient) {
      debugLog('all', `FacilitatorCard — avatar for "${facilitator.title}": ${displayUrl}`);
    }
  }, [displayUrl, facilitator.title, isClient]);
  
  if (isLocked) {
    return (
      <div
        className="flex cursor-pointer flex-col items-center rounded-xl border border-gray-200 p-3 transition-all relative opacity-60 hover:opacity-80 w-full"
        onClick={onClick}
        title="Upgrade your plan to access this facilitator"
      >
        {/* Lock overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-white/70 z-10">
          <Lock className="h-6 w-6 text-indigo-500 mb-1" />
          <span className="text-xs font-semibold text-indigo-600 text-center leading-tight px-1">Upgrade to unlock</span>
        </div>

        <div className="relative mb-4 h-20 w-20 overflow-hidden rounded-full grayscale">
          {isClient ? (
            <Avatar className="h-full w-full">
              {/* NOTE: crossOrigin is intentionally omitted — adding it triggers a CORS
                  preflight for same-origin Railway storage images, which causes them to
                  be blocked when the browser's CORS check fails. */}
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
          ) : (
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
      className={`flex cursor-pointer flex-col items-center rounded-xl border p-3 transition-all w-full ${
        isSelected ? 'border-primary bg-primary/5' : 'border-gray-200 hover:bg-gray-50'
      }`}
      onClick={onClick}
    >
      <div className="relative mb-4 h-20 w-20 overflow-hidden rounded-full">
        {/* Show skeleton while image is loading */}
        {(isLoading || imageLoading || !isClient) && (
          <Skeleton className="absolute inset-0 h-full w-full rounded-full" />
        )}
        
        {isClient ? (
          <Avatar className="h-full w-full">
            {/* NOTE: crossOrigin is intentionally omitted — adding it triggers a CORS
                preflight for same-origin Railway storage images, which causes them to
                be blocked when the browser's CORS check fails. */}
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
        ) : (
          /* Server-side rendering fallback — initials only */
          <div className="flex h-full w-full items-center justify-center bg-gray-200 text-gray-600 text-xl font-medium">
            {facilitator.title?.charAt(0) || 'F'}
          </div>
        )}
      </div>
      <h3 className="text-center text-sm font-medium">{facilitator.title}</h3>
    </div>
  );
};
