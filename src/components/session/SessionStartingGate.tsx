/**
 * Session Starting Gate
 *
 * Session component for the AIfacilitator application.
 */

import React, { useEffect, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, MessageSquare, Users, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface SessionStartingGateProps {
  conversationId: number;
  facilitatorTitle?: string;
  isWaitingForMessage: boolean;
  timeoutReached: boolean;
  currentParticipantCount: number;
  maxParticipants: number;
  onForceGeneration?: () => void;
}

const SessionStartingGate: React.FC<SessionStartingGateProps> = ({
  conversationId,
  facilitatorTitle,
  isWaitingForMessage,
  timeoutReached,
  currentParticipantCount,
  maxParticipants,
  onForceGeneration
}) => {
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [showRetryOption, setShowRetryOption] = useState(false);

  // Show retry option after 30 seconds of waiting
  useEffect(() => {
    if (isWaitingForMessage && !timeoutReached) {
      const timer = setTimeout(() => {
        setShowRetryOption(true);
      }, 30000);
      return () => clearTimeout(timer);
    }
  }, [isWaitingForMessage, timeoutReached]);

  const handleRetryGeneration = async () => {
    if (isRetrying) return;
    
    setIsRetrying(true);
    setRetryCount(prev => prev + 1);
    
    try {
      
      const { data, error } = await supabase.functions.invoke('handle-facilitator-response', {
        body: {
          messages: [],
          conversationId,
          sessionStart: true,
          generateReport: false
        }
      });
      
      if (error) {
        console.error('[SessionStartingGate] Retry failed:', error);
      } else {
        // Reset retry state on success
        setRetryCount(0);
        setShowRetryOption(false);
      }
    } catch (error) {
      console.error('[SessionStartingGate] Exception during retry:', error);
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-2 border-primary/20 shadow-lg">
        <CardContent className="p-8 text-center space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
              <MessageSquare className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-semibold text-foreground">
              Session Starting
            </h2>
            <p className="text-muted-foreground">
              {facilitatorTitle ? `${facilitatorTitle} is preparing your welcome message` : 'Preparing your session'}
            </p>
          </div>

          {/* Status */}
          <div className="space-y-4">
            {isWaitingForMessage && !timeoutReached && (
              <div className="space-y-3">
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  <Clock className="w-3 h-3 mr-1" />
                  AI is crafting your welcome message
                </Badge>
                
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4 mx-auto" />
                  <Skeleton className="h-4 w-1/2 mx-auto" />
                </div>
                
                <p className="text-sm text-muted-foreground">
                  Creating a personalized welcome based on your session context...
                </p>
                
                {showRetryOption && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleRetryGeneration}
                    disabled={isRetrying}
                    className="mt-3"
                  >
                    {isRetrying ? (
                      <>
                        <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                        Retrying...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Retry Generation
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}

            {timeoutReached && (
              <div className="space-y-3">
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                  <Clock className="w-3 h-3 mr-1" />
                  Taking longer than expected
                </Badge>
                <p className="text-sm text-muted-foreground">
                  The AI is working on your welcome message. This might take a moment...
                </p>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleRetryGeneration}
                  disabled={isRetrying}
                  className="mt-3"
                >
                  {isRetrying ? (
                    <>
                      <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                      Retrying...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Try Again
                    </>
                  )}
                </Button>
              </div>
            )}

            {!isWaitingForMessage && (
              <div className="space-y-3">
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  <MessageSquare className="w-3 h-3 mr-1" />
                  Welcome message ready
                </Badge>
                <p className="text-sm text-muted-foreground">
                  Loading your session...
                </p>
              </div>
            )}
            
            {retryCount > 0 && (
              <p className="text-xs text-muted-foreground">
                Retry attempts: {retryCount}
              </p>
            )}
          </div>

          {/* Participant info */}
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>{currentParticipantCount}/{maxParticipants} participants</span>
          </div>

          {/* Session ID for debugging */}
          <div className="text-xs text-muted-foreground/60">
            Session {conversationId}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SessionStartingGate;
