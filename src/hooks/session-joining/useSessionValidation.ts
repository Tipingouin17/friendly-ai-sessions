/**
 * use Session Validation
 *
 * Session joining hook for the AIfacilitator application.
 */

import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { sessionJoinSchema, sanitizeInput, createRateLimiter } from "@/utils/inputValidation";

// Create rate limiter: max 5 join attempts per minute
const joinRateLimiter = createRateLimiter(5, 60000);

interface ValidationParams {
  conversationId: number | null;
  participantName: string;
  avatarSeed: string;
  isAnonymous?: boolean;
}

export function useSessionValidation() {
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);

  const validateSessionJoin = async ({
    conversationId,
    participantName,
    avatarSeed,
    isAnonymous = false
  }: ValidationParams) => {
    try {
      // Validate input parameters
      const validatedData = sessionJoinSchema.parse({
        participantName: sanitizeInput(participantName),
        avatarSeed: sanitizeInput(avatarSeed),
        conversationId,
        isAnonymous
      });

      // Rate limiting check
      const rateLimitKey = `join_${conversationId}_${Date.now().toString().slice(0, -3)}`; // Per minute
      if (!joinRateLimiter(rateLimitKey)) {
        toast({
          title: "Too many attempts",
          description: "Please wait a moment before trying to join again.",
          variant: "destructive",
        });
        return null;
      }

      if (!validatedData.participantName.trim()) {
        toast({
          title: "Please enter your name",
          description: "A name is required to join the session.",
          variant: "destructive",
        });
        return null;
      }

      return validatedData;
    } catch (error: any) {
      setError(error.message || "Validation failed");
      toast({
        title: "Error",
        description: error.message || "Invalid input data. Please try again.",
        variant: "destructive",
      });
      return null;
    }
  };

  return {
    validateSessionJoin,
    error,
    setError
  };
}
