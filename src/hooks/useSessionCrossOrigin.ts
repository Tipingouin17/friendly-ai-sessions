/**
 * use Session Cross Origin
 *
 * Hook for the AIfacilitator application.
 */

import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { isInCrossOriginContext, isInIframe } from "@/utils/crossOriginUtils";
import { useLocation } from "react-router-dom";

export function useSessionCrossOrigin() {
  const location = useLocation();
  const { toast } = useToast();
  const [isCrossOrigin, setIsCrossOrigin] = useState<boolean>(false);
  const [isClient, setIsClient] = useState(false);
  
  // Check for cross-origin context only on client
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    setIsClient(true);
    
    const crossOriginContext = isInCrossOriginContext();
    const inIframe = isInIframe();
    setIsCrossOrigin(crossOriginContext);
    
    if (crossOriginContext) {
      toast({
        title: "Cross-Origin Session",
        description: "You're accessing this session from another site. This may affect some functionality.",
      });
    }
  }, [location.search, toast]);

  return { isCrossOrigin, isClient };
}
