
import { useState, useCallback, useRef } from 'react';
import { useToast } from '@/components/ui/use-toast';

interface UseAutoStartSessionProps {
  onStartSession: () => Promise<void>;
  isSessionStarted: boolean;
  maxParticipants: number;
}

export const useAutoStartSession = ({
  onStartSession,
  isSessionStarted,
  maxParticipants
}: UseAutoStartSessionProps) => {
  const [isAutoStarting, setIsAutoStarting] = useState(false);
  const [autoStartCountdown, setAutoStartCountdown] = useState(0);
  const { toast } = useToast();
  const autoStartTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const clearAutoStartTimer = useCallback(() => {
    if (autoStartTimeoutRef.current) {
      clearTimeout(autoStartTimeoutRef.current);
      autoStartTimeoutRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setIsAutoStarting(false);
    setAutoStartCountdown(0);
  }, []);

  const triggerAutoStart = useCallback(async (currentParticipantCount: number) => {
    // Don't auto-start if session is already started or starting
    if (isSessionStarted || isAutoStarting) {
      return;
    }

    // Only auto-start if we've reached max capacity
    if (currentParticipantCount < maxParticipants) {
      return;
    }

    console.log(`🚀 Auto-starting session: ${currentParticipantCount}/${maxParticipants} participants reached`);
    
    setIsAutoStarting(true);
    setAutoStartCountdown(3);

    // Show toast notification
    toast({
      title: "Session Full",
      description: `Maximum capacity reached (${maxParticipants} participants). Auto-starting in 3 seconds...`,
    });

    // Start countdown
    countdownIntervalRef.current = setInterval(() => {
      setAutoStartCountdown((prev) => {
        if (prev <= 1) {
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Set auto-start timer
    autoStartTimeoutRef.current = setTimeout(async () => {
      try {
        console.log('🤖 Executing auto-start...');
        await onStartSession();
        toast({
          title: "Session Started",
          description: "Session has been automatically started at full capacity.",
        });
      } catch (error) {
        console.error('Auto-start failed:', error);
        toast({
          title: "Auto-start Failed",
          description: "Failed to auto-start session. Please start manually.",
          variant: "destructive",
        });
      } finally {
        setIsAutoStarting(false);
        setAutoStartCountdown(0);
      }
    }, 3000);
  }, [isSessionStarted, isAutoStarting, maxParticipants, onStartSession, toast]);

  const cancelAutoStart = useCallback(() => {
    console.log('🛑 Auto-start cancelled by host');
    clearAutoStartTimer();
    toast({
      title: "Auto-start Cancelled",
      description: "Auto-start has been cancelled. You can still start manually.",
    });
  }, [clearAutoStartTimer, toast]);

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    clearAutoStartTimer();
  }, [clearAutoStartTimer]);

  return {
    isAutoStarting,
    autoStartCountdown,
    triggerAutoStart,
    cancelAutoStart,
    cleanup
  };
};
