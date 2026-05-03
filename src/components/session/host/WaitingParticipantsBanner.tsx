/**
 * Waiting Participants Banner
 *
 * Shows the host a notification when participants are waiting to join a full session.
 * Polls session_events for participant_waiting events every 15 seconds.
 *
 * Improvements:
 * - Auto-expands when a new waiting participant notification arrives
 * - Displays participant name and optional message prominently
 * - "Dismiss" action to clear the notification once handled
 */

import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Bell, X, UserPlus, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface WaitingParticipantsBannerProps {
  conversationId: number | null;
}

interface WaitingEvent {
  id: number;
  created_at: string;
  data: {
    name?: string;
    message?: string;
    timestamp?: string;
  } | null;
}

const WaitingParticipantsBanner: React.FC<WaitingParticipantsBannerProps> = ({
  conversationId,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  // Auto-expand when there are waiting participants
  const [expanded, setExpanded] = useState(true);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  const prevCountRef = useRef(0);

  const { data: waitingEvents = [] } = useQuery<WaitingEvent[]>({
    queryKey: ["waiting-participants", conversationId],
    enabled: !!conversationId,
    refetchInterval: 15_000,
    queryFn: async () => {
      const { data, error } = await api
        .from("session_events")
        .select("id, created_at, data")
        .eq("conversation_id", conversationId!)
        .eq("event_type", "participant_waiting")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as WaitingEvent[];
    },
  });

  // Auto-expand and toast when a new notification arrives
  useEffect(() => {
    const visible = waitingEvents.filter((e) => !dismissed.has(e.id));
    if (visible.length > prevCountRef.current) {
      setExpanded(true);
      if (prevCountRef.current > 0) {
        toast({
          title: "New participant waiting",
          description: `${visible[0]?.data?.name || "Someone"} is waiting to join the session.`,
        });
      }
    }
    prevCountRef.current = visible.length;
  }, [waitingEvents, dismissed, toast]);

  // Dismiss a single waiting event (mark it as handled by deleting it)
  const dismissMutation = useMutation({
    mutationFn: async (eventId: number) => {
      const { error } = await api
        .from("session_events")
        .delete()
        .eq("id", eventId);
      if (error) throw error;
    },
    onSuccess: (_, eventId) => {
      setDismissed((prev) => new Set(prev).add(eventId));
      queryClient.invalidateQueries({ queryKey: ["waiting-participants", conversationId] });
      toast({ title: "Notification dismissed", description: "The waiting notification has been cleared." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const visible = waitingEvents.filter((e) => !dismissed.has(e.id));

  if (visible.length === 0) return null;

  return (
    <div className="mx-4 mt-3 rounded-xl border border-amber-200 bg-amber-50 shadow-sm overflow-hidden">
      {/* Header row */}
      <div
        className="flex items-center gap-2 px-4 py-2.5 cursor-pointer select-none"
        onClick={() => setExpanded((v) => !v)}
      >
        <Bell className="h-4 w-4 text-amber-600 shrink-0 animate-pulse" />
        <span className="flex-1 text-sm font-semibold text-amber-800">
          {visible.length} participant{visible.length !== 1 ? "s" : ""} waiting to join
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-amber-600 hover:bg-amber-100"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>

      {/* Expanded list */}
      {expanded && (
        <div className="border-t border-amber-200 divide-y divide-amber-100">
          {visible.map((event) => {
            // data may arrive as a parsed object (after JSONB codec fix) or
            // as a raw JSON string (legacy rows). Handle both cases.
            const rawData =
              typeof event.data === "string"
                ? (() => { try { return JSON.parse(event.data as unknown as string); } catch { return null; } })()
                : event.data;

            const name = rawData?.name?.trim() || "Anonymous";
            const message = rawData?.message?.trim();
            const time = new Date(event.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });
            return (
              <div key={event.id} className="flex items-start gap-3 px-4 py-3">
                {/* Avatar */}
                <div className="mt-0.5 h-8 w-8 rounded-full bg-amber-200 flex items-center justify-center shrink-0 text-amber-800 font-bold text-sm uppercase">
                  {name !== "Anonymous" ? name[0] : <UserPlus className="h-4 w-4 text-amber-700" />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-semibold text-amber-900">{name}</span>
                    <span className="text-xs text-amber-500">{time}</span>
                  </div>
                  {message ? (
                    <p className="text-xs text-amber-700 mt-0.5 leading-snug italic">"{message}"</p>
                  ) : (
                    <p className="text-xs text-amber-500 mt-0.5">No message provided.</p>
                  )}
                </div>

                {/* Dismiss button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-amber-400 hover:text-amber-700 hover:bg-amber-100 shrink-0"
                  title="Dismiss notification"
                  onClick={() => dismissMutation.mutate(event.id)}
                  disabled={dismissMutation.isPending}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default WaitingParticipantsBanner;
