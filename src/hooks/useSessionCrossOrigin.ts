
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { isInCrossOriginContext, isInIframe } from "@/utils/crossOriginUtils";
import { useLocation } from "react-router-dom";

export function useSessionCrossOrigin() {
  const location = useLocation();
  const { toast } = useToast();
  const [isCrossOrigin, setIsCrossOrigin] = useState<boolean>(false);
  
  // Check for cross-origin context
  useEffect(() => {
    const crossOriginContext = isInCrossOriginContext();
    const inIframe = isInIframe();
    setIsCrossOrigin(crossOriginContext);
    
    console.log("Session environment:", {
      isInCrossOriginContext: crossOriginContext,
      isInIframe: inIframe,
      locationSearch: location.search,
    });

    if (crossOriginContext) {
      toast({
        title: "Cross-Origin Session",
        description: "You're accessing this session from another site. This may affect some functionality.",
      });
    }
  }, [location.search, toast]);

  return { isCrossOrigin };
}
