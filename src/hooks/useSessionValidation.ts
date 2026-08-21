/**
 * use Session Validation
 *
 * Hook for the AIfacilitator application.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import api from "@/lib/api";

interface UseSessionValidationProps {
  conversationId: number | null;
  isAdmin?: boolean;
}

const TERMINAL_SESSION_STATUSES = new Set(['completed', 'cancelled', 'canceled', 'expired', 'ended']);
const isTerminalSession = (conversation: { is_session_ended?: unknown; status?: unknown }) => {
  if (conversation.is_session_ended === true) return true;
  const status = typeof conversation.status === 'string' ? conversation.status.toLowerCase() : '';
  return TERMINAL_SESSION_STATUSES.has(status);
};

export const useSessionValidation = ({ conversationId, isAdmin = false }: UseSessionValidationProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(true);

  useEffect(() => {
    const validateSession = async () => {
      if (!conversationId) {
        setIsValidating(false);
        setIsValid(false);
        return;
      }

      try {
        const { data, error } = await api
          .from('conversations')
          .select('is_session_ended, status, user_id')
          .eq('id', conversationId)
          .single();

        if (error) {
          console.error('Error validating session:', error);
          setIsValid(false);
          setIsValidating(false);
          
          if (!isAdmin) {
            toast({
              title: "Session Not Found",
              description: "The session you're trying to access doesn't exist.",
              variant: "destructive"
            });
            navigate('/', { replace: true });
          }
          return;
        }

        // Check if session is ended.
        // For participants we allow them to stay on the page and see the transcript
        // in read-only mode — the ParticipantMessagingView renders an ended banner.
        // Only redirect hosts/admins away (they are handled by their own hooks).
        if (isTerminalSession(data) && isAdmin) {
          setIsValid(false);
          navigate('/past-workshops', { replace: true });
          return;
        }

        // Participants: mark valid so the session page stays mounted
        if (isTerminalSession(data)) {
          // Still mark as valid so the page renders; the ended banner handles UX
          setIsValid(true);
          setIsValidating(false);
          return;
        }

        setIsValid(true);
      } catch (error) {
        console.error('Exception during session validation:', error);
        setIsValid(false);
        
        if (!isAdmin) {
          toast({
            title: "Error",
            description: "Unable to validate session. Please try again.",
            variant: "destructive"
          });
          navigate('/', { replace: true });
        }
      } finally {
        setIsValidating(false);
      }
    };

    validateSession();
  }, [conversationId, isAdmin, navigate, toast]);

  return { isValidating, isValid };
};
