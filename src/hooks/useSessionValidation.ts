
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface UseSessionValidationProps {
  conversationId: number | null;
  isAdmin?: boolean;
}

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
        const { data, error } = await supabase
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

        // Check if session is ended
        if (data.is_session_ended || data.status !== 'active') {
          console.log('Session is ended or inactive, redirecting...');
          setIsValid(false);
          
          toast({
            title: "Session Ended",
            description: "This session has been closed and moved to past workshops.",
          });
          
          navigate('/past-workshops', { replace: true });
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
