
import React, { useEffect, useState } from 'react';
import { QrCode, Link, Copy, Check, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { supabase } from '@/integrations/supabase/client';

interface SessionJoinInfoProps {
  conversationId: number | null;
  currentParticipantCount?: number;
  onSessionFull?: () => void;
}

const SessionJoinInfo = ({ conversationId, currentParticipantCount = 0, onSessionFull }: SessionJoinInfoProps) => {
  const [copied, setCopied] = useState(false);
  const [sessionLink, setSessionLink] = useState('');
  const [realParticipantCount, setRealParticipantCount] = useState(currentParticipantCount);
  const [maxParticipantsForSession, setMaxParticipantsForSession] = useState(0);
  const { maxParticipants: planMaxParticipants } = usePlanLimits();
  
  useEffect(() => {
    // Create the session join link
    if (conversationId) {
      const baseUrl = window.location.origin;
      setSessionLink(`${baseUrl}/join-session?id=${conversationId}`);
    }
  }, [conversationId]);

  useEffect(() => {
    // Update the real participant count if it changes from props
    if (currentParticipantCount !== undefined) {
      setRealParticipantCount(currentParticipantCount);
    }
  }, [currentParticipantCount]);

  useEffect(() => {
    // Set up a real-time subscription to track changes to the conversation
    if (conversationId) {
      const fetchConversationDetails = async () => {
        try {
          const { data, error } = await supabase
            .from('conversations')
            .select('participants, current_participants')
            .eq('id', conversationId)
            .maybeSingle();
            
          if (error) {
            console.error('Error fetching conversation details:', error);
            return;
          }
            
          if (data) {
            // Use the participants field (max allowed participants) for the session
            if (data.participants !== null && data.participants > 0) {
              setMaxParticipantsForSession(data.participants);
            }
            
            // If there's a current_participants field, use it for real count
            if (data.current_participants !== undefined && data.current_participants !== null) {
              setRealParticipantCount(data.current_participants);
            }
          }
        } catch (error) {
          console.error('Error fetching conversation details:', error);
        }
      };

      fetchConversationDetails();

      // Setup subscription for real-time updates
      const subscription = supabase
        .channel(`conversation-${conversationId}`)
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'conversations',
          filter: `id=eq.${conversationId}`
        }, (payload) => {
          if (payload.new) {
            if (payload.new.participants !== null && payload.new.participants > 0) {
              setMaxParticipantsForSession(payload.new.participants);
            }
            if (payload.new.current_participants !== undefined && 
                payload.new.current_participants !== null) {
              setRealParticipantCount(payload.new.current_participants);
              
              // Check if session is full and trigger callback if provided
              if (onSessionFull && payload.new.participants > 0 && 
                  payload.new.current_participants >= payload.new.participants) {
                onSessionFull();
              }
            }
          }
        })
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [conversationId, onSessionFull]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(sessionLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!conversationId) return null;

  // Use the session-specific max participants if it's set and valid, fallback to plan limit
  const effectiveMaxParticipants = (maxParticipantsForSession && maxParticipantsForSession > 0) 
    ? maxParticipantsForSession 
    : planMaxParticipants;
  
  // For a new session, ensure we don't exceed the max limit
  const adjustedRealCount = Math.min(realParticipantCount, effectiveMaxParticipants);
  
  // Calculate remaining spots - ensure max is greater than 0 to avoid division by zero issues
  const remainingSpots = effectiveMaxParticipants > 0 ? effectiveMaxParticipants - adjustedRealCount : 0;
  
  // Only consider full if we've set a limit and the adjusted count reaches it
  const isFull = effectiveMaxParticipants > 0 && remainingSpots <= 0;

  return (
    <div className="bg-white/80 backdrop-blur-sm p-3 rounded-lg shadow-sm border border-gray-100 w-full">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium flex items-center gap-1 text-gray-700">
          <QrCode className="w-4 h-4" /> Join this session
        </h3>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 px-2"
                onClick={handleCopyLink}
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Copy join link</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      <div className="flex flex-col items-center space-y-2">
        {isFull ? (
          <div className="text-center p-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-md text-xs">
            <Users className="w-3.5 h-3.5 mx-auto mb-1" />
            <p>Session is full</p>
            <p>Max {effectiveMaxParticipants} participants</p>
          </div>
        ) : (
          <>
            {/* QR Code - using a simple QR code API */}
            <img 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(sessionLink)}`}
              alt="Session QR Code"
              className="rounded-md border border-gray-200 bg-white p-1"
              width={120}
              height={120}
            />
            
            <div className="w-full flex items-center gap-1 bg-gray-50 p-2 rounded text-xs text-gray-700 border border-gray-200">
              <Link className="w-3 h-3 text-gray-500 flex-shrink-0" />
              <span className="truncate">{sessionLink}</span>
            </div>
            
            <div className="w-full text-xs text-center text-gray-600 flex items-center justify-center gap-1">
              <Users className="w-3 h-3" />
              <span>{adjustedRealCount} of {effectiveMaxParticipants} participants</span>
              {remainingSpots > 0 && (
                <span className="text-green-600 font-medium">
                  ({remainingSpots} spots left)
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SessionJoinInfo;
