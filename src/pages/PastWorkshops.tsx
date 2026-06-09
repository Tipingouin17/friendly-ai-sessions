/**
 * Past Workshops — World-class redesign
 * Premium dashboard with stats header, filter tabs, rich workshop cards.
 */
import { useEffect, useState } from "react";
import { Calendar, PlusCircle, Download, ChevronLeft, ChevronRight, Bookmark, BookmarkCheck, Users, MessageSquare, Clock, Zap, LayoutDashboard, Activity, AlertTriangle, Eye, UserRound, CalendarClock } from "lucide-react";
import api from "@/lib/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { format, differenceInMinutes } from "date-fns";
import { Workshop } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useNavigate } from "react-router-dom";
import { clearAllParticipantState } from "@/lib/api";
import { useNavigateToSession } from "@/hooks/session-joining/useNavigateToSession";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { useWorkshopReports } from "@/hooks/useWorkshopReports";
import { useReportDownloader } from "@/hooks/session-closure/useReportDownloader";
import ReportDownloadDialog from "@/components/session/ReportDownloadDialog";
import SessionAnalyticsDashboard from "@/components/session/admin/SessionAnalyticsDashboard";
import WorkshopMetrics from "@/components/session/WorkshopMetrics";
import FacilitatorInfo from "@/components/session/FacilitatorInfo";
import WorkshopTags from "@/components/session/WorkshopTags";
import PageHead from "@/components/PageHead";
import { useToast } from "@/components/ui/use-toast";

const ITEMS_PER_PAGE = 12;

const STALE_SESSION_TIMEOUT_MINUTES = 120;


type OwnerProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  display_name: string | null;
};

type SessionClassificationId = 'real' | 'demo' | 'dry-run' | 'exploratory' | 'unclear';

type SessionClassification = {
  id: SessionClassificationId;
  label: string;
  badgeClass: string;
  headline: string;
  summary: string;
  evidence: string[];
};

const getScheduledStartIso = (flowConfig: unknown): string | null => {
  if (!flowConfig || typeof flowConfig !== 'object' || Array.isArray(flowConfig)) return null;
  const value = (flowConfig as Record<string, unknown>).scheduled_start_at;
  return typeof value === 'string' && value ? value : null;
};

const getOwnerDisplayName = (profile?: OwnerProfile): string => {
  return profile?.display_name?.trim() || profile?.full_name?.trim() || 'Unknown host';
};

const getOwnerEmail = (profile?: OwnerProfile): string => {
  return profile?.email?.trim() || 'Email unavailable';
};

const getScheduleLabel = (scheduledStartIso: string | null): string => {
  if (!scheduledStartIso) return 'Ad hoc';
  const scheduledDate = new Date(scheduledStartIso);
  if (Number.isNaN(scheduledDate.getTime())) return 'Ad hoc';
  return `Scheduled ${format(scheduledDate, 'MMM d, h:mm a')}`;
};

const getScheduleNarrative = (workshop: Workshop, scheduledStartIso: string | null): string => {
  if (!scheduledStartIso) {
    return 'This session was started without a stored future scheduled start time, so it is treated as an ad hoc session.';
  }

  const scheduledDate = new Date(scheduledStartIso);
  if (Number.isNaN(scheduledDate.getTime())) {
    return 'This session has scheduling metadata, but the scheduled start time could not be interpreted.';
  }

  const createdDate = workshop.created_at ? new Date(workshop.created_at) : null;
  const endedDate = workshop.ended_at ? new Date(workshop.ended_at) : null;
  const createdText = createdDate && !Number.isNaN(createdDate.getTime()) ? format(createdDate, 'MMM d, h:mm a') : 'an unknown time';
  const endedText = endedDate && !Number.isNaN(endedDate.getTime()) ? ` and ended ${format(endedDate, 'MMM d, h:mm a')}` : '';
  return `This session was scheduled for ${format(scheduledDate, 'MMM d, yyyy h:mm a')}, created ${createdText}${endedText}.`;
};

const classifySession = ({
  workshop,
  participantCount,
  messageCount,
  duration,
  scheduledStartIso,
}: {
  workshop: Workshop;
  participantCount: number;
  messageCount: number;
  duration: number;
  scheduledStartIso: string | null;
}): SessionClassification => {
  const engagementScore = workshop.participant_engagement_score || 0;
  const attendeeCount = Math.max(participantCount - 1, 0);
  const isScheduled = Boolean(scheduledStartIso);
  const isAutoClosed = workshop.status === 'auto_closed_inactive';
  const evidence = [
    `${participantCount} recorded participant${participantCount === 1 ? '' : 's'} (${attendeeCount} attendee${attendeeCount === 1 ? '' : 's'} beyond the host)`,
    `${messageCount} saved message${messageCount === 1 ? '' : 's'}`,
    duration > 0 ? `${duration} minute open-to-close duration` : 'No reliable saved duration',
    engagementScore > 0 ? `${engagementScore.toFixed(1)} engagement score` : 'No saved engagement score',
    isScheduled ? 'Scheduled start metadata is present' : 'No scheduled start metadata is present',
  ];

  if (isAutoClosed) {
    evidence.push(`Auto-closed after ${STALE_SESSION_TIMEOUT_MINUTES} minutes of inactivity`);
  }

  const strongRealSignals =
    (participantCount >= 3 && messageCount >= 20 && duration >= 15) ||
    (isScheduled && participantCount >= 2 && messageCount >= 15 && engagementScore >= 3) ||
    (participantCount >= 4 && messageCount >= 12 && duration >= 10);

  if (strongRealSignals) {
    return {
      id: 'real',
      label: 'Real Workshop',
      badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      headline: 'Likely real workshop',
      summary: 'The session shows strong workshop signals: multiple people, sustained activity, and meaningful saved conversation volume.',
      evidence,
    };
  }

  const dryRunSignals =
    messageCount <= 3 ||
    (participantCount <= 1 && messageCount <= 6 && duration <= 10) ||
    (duration > 0 && duration <= 5 && messageCount <= 8);

  if (dryRunSignals) {
    return {
      id: 'dry-run',
      label: 'Dry Run / Test',
      badgeClass: 'border-amber-200 bg-amber-50 text-amber-700',
      headline: 'Likely dry run or technical test',
      summary: 'The session appears to have been used to test setup or flow mechanics, with limited participant and message activity.',
      evidence,
    };
  }

  const demoSignals =
    participantCount <= 2 &&
    messageCount >= 8 &&
    messageCount < 25 &&
    duration >= 5 &&
    duration <= 45;

  if (demoSignals) {
    return {
      id: 'demo',
      label: 'Demo',
      badgeClass: 'border-sky-200 bg-sky-50 text-sky-700',
      headline: 'Likely demo session',
      summary: 'The session has enough activity to show the experience, but the small participant footprint suggests a demonstration rather than a full workshop.',
      evidence,
    };
  }

  const exploratorySignals =
    messageCount >= 4 ||
    duration >= 10 ||
    engagementScore > 0;

  if (exploratorySignals) {
    return {
      id: 'exploratory',
      label: 'Exploratory',
      badgeClass: 'border-violet-200 bg-violet-50 text-violet-700',
      headline: 'Likely exploratory session',
      summary: 'The session contains some meaningful use, but the signals are not strong enough to classify it as a full workshop or a compact demo.',
      evidence,
    };
  }

  return {
    id: 'unclear',
    label: 'Unclear',
    badgeClass: 'border-gray-200 bg-gray-50 text-gray-700',
    headline: 'Session type unclear',
    summary: 'There is not enough saved activity to confidently identify how this session was used.',
    evidence,
  };
};

const parseTime = (value?: string | null): number => {
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const getMostRecentIso = (...values: Array<string | null | undefined>): string | null => {
  const latest = values
    .map(parseTime)
    .filter((timestamp) => timestamp > 0)
    .sort((a, b) => b - a)[0];

  return latest ? new Date(latest).toISOString() : null;
};

const calculateInactiveDurationMinutes = (workshop: Workshop, lastActivityAt: string | null): number => {
  const createdAt = parseTime(workshop.created_at);
  const lastActivity = parseTime(lastActivityAt);

  if (!createdAt || !lastActivity || lastActivity <= createdAt) return 0;

  const minutes = Math.round((lastActivity - createdAt) / 60_000);
  return minutes > 480 ? 0 : Math.max(1, minutes);
};

const fetchLatestActivityAt = async (conversationId: number): Promise<string | null> => {
  const [latestEvent, latestMessage] = await Promise.all([
    api
      .from('session_events')
      .select('created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    api
      .from('messages')
      .select('created_at, updated_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (latestEvent.error) console.warn('Unable to inspect latest session event for stale-session cleanup', latestEvent.error);
  if (latestMessage.error) console.warn('Unable to inspect latest message for stale-session cleanup', latestMessage.error);

  return getMostRecentIso(
    latestEvent.data?.created_at,
    latestMessage.data?.created_at,
    latestMessage.data?.updated_at,
  );
};

const autoCloseInactiveWorkshops = async (workshops: Workshop[]): Promise<Workshop[]> => {
  const now = Date.now();
  const checked = await Promise.all(workshops.map(async (workshop) => {
    const latestActivityAt = await fetchLatestActivityAt(workshop.id);
    const lastActivityAt = getMostRecentIso(
      latestActivityAt,
      workshop.updated_at,
      workshop.created_at,
    );
    const lastActivityTime = parseTime(lastActivityAt);
    const inactiveMinutes = lastActivityTime ? Math.floor((now - lastActivityTime) / 60_000) : 0;

    return { workshop, lastActivityAt, inactiveMinutes };
  }));

  const stale = checked.filter(({ inactiveMinutes }) => inactiveMinutes >= STALE_SESSION_TIMEOUT_MINUTES);

  await Promise.all(stale.map(async ({ workshop, lastActivityAt }) => {
    const durationMinutes = calculateInactiveDurationMinutes(workshop, lastActivityAt);
    const updatePayload: Record<string, string | number | boolean | null> = {
      is_session_ended: true,
      status: 'auto_closed_inactive',
      ended_at: lastActivityAt ?? new Date().toISOString(),
      current_participants: 0,
      updated_at: new Date().toISOString(),
    };

    if (!workshop.session_duration_minutes && durationMinutes > 0) {
      updatePayload.session_duration_minutes = durationMinutes;
    }

    const { error } = await api
      .from('conversations')
      .update(updatePayload)
      .eq('id', workshop.id)
      .eq('is_session_ended', false);

    if (error) {
      console.warn(`Unable to auto-close inactive session ${workshop.id}`, error);
    }
  }));

  const staleIds = new Set(stale.map(({ workshop }) => workshop.id));
  return checked
    .filter(({ workshop }) => !staleIds.has(workshop.id))
    .map(({ workshop }) => workshop);
};


const calculateDuration = (workshop: Workshop): number => {
  if (workshop.session_duration_minutes && workshop.session_duration_minutes > 0) {
    return workshop.session_duration_minutes;
  }
  if (workshop.created_at && workshop.ended_at) {
    const diff = differenceInMinutes(new Date(workshop.ended_at), new Date(workshop.created_at));
    // Cap at 480 minutes (8 hours) to avoid showing absurd durations for sessions
    // that were left open for days (e.g. ended via direct DB update without proper closure)
    return diff > 480 ? 0 : Math.max(1, diff);
  }
  return 0;
};

const getWorkshopTitle = (workshop: Workshop): string => {
  if (workshop.sessions?.title && workshop.sessions.title !== 'Untitled Workshop') return workshop.sessions.title;
  if (workshop.sessions?.facilitators?.title) return `${workshop.sessions.facilitators.title} Session`;
  if (workshop.sessions?.objective) {
    const obj = workshop.sessions.objective;
    return obj.length > 50 ? `${obj.slice(0, 47)}...` : obj;
  }
  if (workshop.created_at) return `Workshop ${format(new Date(workshop.created_at), 'MMM d, yyyy')}`;
  return 'Workshop';
};

const fetchPastWorkshops = async () => {
  const { data, error } = await api
    .from('conversations')
    .select(`*, sessions!conversations_sessions_id_fkey (title, facilitator, objective, difficulty_level, tags, facilitators!sessions_facilitator_fkey (title, profile_picture)), messages!messages_conversation_id_fkey (id, role)`)
    .eq('is_session_ended', true)
    .order('ended_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((w: Workshop & { messages?: { id: number; role: string }[] }) => {
    const live = w.messages?.length ?? 0;
    return { ...w, total_messages: (w.total_messages ?? 0) > 0 ? w.total_messages : live, messages: undefined };
  }) as Workshop[];
};

const fetchActiveWorkshops = async () => {
  const { data, error } = await api
    .from('conversations')
    .select(`*, sessions!conversations_sessions_id_fkey (title, facilitator, objective, difficulty_level, tags, facilitators!sessions_facilitator_fkey (title, profile_picture))`)
    .eq('is_session_ended', false)
    .eq('status', 'active')
    .order('created_at', { ascending: false });
  if (error) throw error;

  return autoCloseInactiveWorkshops((data || []) as Workshop[]);
};

/* ── Workshop Card ── */
const WorkshopCard = ({ workshop, isActive, canGenerateReports, canSaveSessions, reportData, onSaveToggle, ownerProfile }: {
  workshop: Workshop; isActive: boolean; canGenerateReports: boolean; canSaveSessions: boolean;
  reportData?: Record<string, unknown>; onSaveToggle?: (id: number, saved: boolean) => void; ownerProfile?: OwnerProfile;
}) => {
  const { navigateToHostSession } = useNavigateToSession();
  const { downloadReport } = useReportDownloader();
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleSaveToggle = async () => {
    if (!canSaveSessions) {
      toast({ title: 'Upgrade required', description: 'Save Sessions is available on Starter and Premium plans.', variant: 'destructive' });
      return;
    }
    setIsSaving(true);
    const newState = !workshop.is_saved;
    const { error } = await api.from('conversations').update({ is_saved: newState }).eq('id', workshop.id);
    setIsSaving(false);
    if (error) {
      toast({ title: 'Error', description: 'Failed to update saved status.', variant: 'destructive' });
    } else {
      toast({ title: newState ? 'Session saved' : 'Session unsaved', description: newState ? 'Added to your library.' : 'Removed from your library.' });
      onSaveToggle?.(workshop.id, newState);
    }
  };

  const participantCount = isActive
    ? (workshop.current_participants ?? workshop.participants ?? 0)
    : (workshop.participants ?? workshop.current_participants ?? 0);
  const attendeeCapacity = Math.max((workshop.participants ?? 0) - 1, 0);
  const attendeeLabel = isActive ? 'Live now' : 'Final count';
  const messageCount = workshop.total_messages || 0;
  const duration = calculateDuration(workshop);
  const title = getWorkshopTitle(workshop);
  const hasContent = messageCount > 0;
  const engagementScore = workshop.participant_engagement_score || 0;
  const isAutoClosed = workshop.status === 'auto_closed_inactive';
  const scheduledStartIso = getScheduledStartIso(workshop.flow_config);
  const isScheduled = Boolean(scheduledStartIso);
  const scheduleLabel = getScheduleLabel(scheduledStartIso);
  const ownerName = getOwnerDisplayName(ownerProfile);
  const ownerEmail = getOwnerEmail(ownerProfile);
  const classification = classifySession({ workshop, participantCount, messageCount, duration, scheduledStartIso });

  // Colour accent per difficulty
  const difficultyAccent: Record<string, string> = {
    beginner: 'from-emerald-500 to-teal-500',
    intermediate: 'from-amber-500 to-orange-500',
    advanced: 'from-rose-500 to-pink-500',
  };
  const accent = difficultyAccent[workshop.sessions?.difficulty_level?.toLowerCase() || ''] || 'from-indigo-500 to-violet-500';

  return (
    <>
      <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-shadow hover:shadow-md ${isActive ? 'border-emerald-300 ring-1 ring-emerald-200' : 'border-gray-100'}`}>
        {/* Coloured top strip */}
        <div className={`h-1.5 bg-gradient-to-r ${isActive ? 'from-emerald-400 to-teal-400' : accent}`} />

        <div className="p-5">
          {/* Header row */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {isActive && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live
                  </span>
                )}
                <WorkshopTags difficulty={workshop.sessions?.difficulty_level} tags={workshop.sessions?.tags} isActive={false} />
              </div>
              <h3 className="text-base font-semibold text-gray-900 leading-snug truncate">{title}</h3>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Calendar size={11} />
                  {format(new Date(workshop.created_at), 'MMM d, yyyy')}
                </span>
                <FacilitatorInfo facilitatorName={workshop.sessions?.facilitators?.title} facilitatorAvatar={workshop.sessions?.facilitators?.profile_picture} />
              </div>
            </div>

            {/* Save button */}
            {!isActive && (
              <button
                onClick={handleSaveToggle}
                disabled={isSaving}
                title={canSaveSessions ? (workshop.is_saved ? 'Unsave' : 'Save') : 'Upgrade to save'}
                className={`flex-shrink-0 p-1.5 rounded-lg transition-colors ${canSaveSessions ? (workshop.is_saved ? 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100' : 'text-gray-400 hover:text-indigo-500 hover:bg-indigo-50') : 'text-gray-200 cursor-not-allowed'}`}
              >
                {workshop.is_saved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
              </button>
            )}
          </div>

          {/* Objective snippet */}
          {workshop.sessions?.objective && (
            <p className="text-xs text-gray-500 leading-relaxed mb-4 line-clamp-2">
              {workshop.sessions.objective}
            </p>
          )}

          <div className="mb-4 flex flex-wrap gap-2">
            <Badge variant="outline" className={classification.badgeClass}>{classification.label}</Badge>
            <Badge variant="outline" className={isScheduled ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'border-gray-200 bg-gray-50 text-gray-700'}>
              <CalendarClock size={11} className="mr-1" />
              {isScheduled ? 'Scheduled' : 'Ad hoc'}
            </Badge>
          </div>

          <div className="mb-4 rounded-xl border border-gray-100 bg-gray-50/70 px-3 py-2">
            <div className="flex items-start gap-2 text-xs text-gray-600">
              <UserRound size={13} className="mt-0.5 flex-shrink-0 text-gray-400" />
              <div className="min-w-0">
                <p className="font-medium text-gray-700 truncate">Started by {ownerName}</p>
                <p className="truncate text-gray-400">{ownerEmail} · {scheduleLabel}</p>
              </div>
            </div>
          </div>

          {/* Metrics row */}
          <div className="grid grid-cols-2 gap-2 mb-3 sm:grid-cols-4">
            <MetricPill
              icon={<Users size={12} />}
              value={participantCount}
              label={attendeeLabel}
              helper={attendeeCapacity > 0 ? `Seat limit: ${attendeeCapacity}` : 'Host-only or no seat limit saved'}
            />
            <MetricPill
              icon={<MessageSquare size={12} />}
              value={messageCount}
              label="Saved messages"
              helper="Final conversation total"
            />
            <MetricPill
              icon={<Clock size={12} />}
              value={duration > 0 ? `${duration}m` : '—'}
              label={isActive ? 'Open time' : 'Session length'}
              helper={isActive ? `${STALE_SESSION_TIMEOUT_MINUTES}m inactivity cleanup` : 'Saved open-to-close duration'}
            />
            <MetricPill
              icon={<Zap size={12} />}
              value={engagementScore > 0 ? engagementScore.toFixed(1) : '—'}
              label="Engagement"
              helper="Saved summary score"
              highlight={engagementScore >= 4 ? 'emerald' : engagementScore >= 2.5 ? 'indigo' : undefined}
            />
          </div>

          {!isActive && isAutoClosed && (
            <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
              <span>Auto-closed after {STALE_SESSION_TIMEOUT_MINUTES} minutes without activity. The card shows saved summary values; diagnostics shows raw event activity.</span>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-50">
            <span className="text-xs text-gray-400">
              {isActive ? (
                <span className="text-emerald-600 font-medium">In progress</span>
              ) : workshop.ended_at ? (
                `${isAutoClosed ? 'Auto-closed' : 'Completed'} ${format(new Date(workshop.ended_at), 'PP')}`
              ) : ''}
            </span>
            <div className="flex flex-wrap justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowDetails(true)} className="rounded-full h-8 text-xs border-slate-200 text-slate-700 hover:bg-slate-50">
                <Eye size={12} className="mr-1.5" />
                View
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowDiagnostics(true)} className="rounded-full h-8 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50">
                <Activity size={12} className="mr-1.5" />
                Diagnostics
              </Button>
              {isActive && (
                <Button size="sm" onClick={() => navigateToHostSession(workshop.id)} className="rounded-full h-8 text-xs bg-indigo-600 hover:bg-indigo-700">
                  Manage Session
                </Button>
              )}
              {!isActive && canGenerateReports && reportData && hasContent && (
                <Button size="sm" variant="outline" onClick={() => setShowReportDialog(true)} className="rounded-full h-8 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50">
                  <Download size={12} className="mr-1.5" />
                  Report
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>


      <Sheet open={showDetails} onOpenChange={setShowDetails}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader className="mb-5 pr-8">
            <SheetTitle>Session details</SheetTitle>
            <SheetDescription>
              A plain-language summary of what happened in “{title}”, who started it, and how it was scheduled.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-5">
            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="mb-3 flex flex-wrap gap-2">
                <Badge variant="outline" className={classification.badgeClass}>{classification.label}</Badge>
                <Badge variant="outline" className={isScheduled ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'border-gray-200 bg-gray-50 text-gray-700'}>
                  {isScheduled ? 'Scheduled' : 'Ad hoc'}
                </Badge>
                {isAutoClosed && <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">Auto-closed</Badge>}
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{classification.headline}</h3>
              <p className="mt-2 text-sm leading-6 text-gray-600">{classification.summary}</p>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <h4 className="text-sm font-semibold text-gray-900">Narrative summary</h4>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                “{title}” was initiated by <span className="font-medium text-gray-800">{ownerName}</span> ({ownerEmail}).
                It recorded {participantCount} participant{participantCount === 1 ? '' : 's'}, {messageCount} saved message{messageCount === 1 ? '' : 's'},
                {duration > 0 ? ` and a saved duration of ${duration} minutes.` : ' and no reliable saved duration.'}
              </p>
              <p className="mt-2 text-sm leading-6 text-gray-600">{getScheduleNarrative(workshop, scheduledStartIso)}</p>
              {workshop.sessions?.objective && (
                <div className="mt-3 rounded-xl bg-gray-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Workshop objective</p>
                  <p className="mt-1 text-sm leading-6 text-gray-600">{workshop.sessions.objective}</p>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <h4 className="text-sm font-semibold text-gray-900">Classification evidence</h4>
              <ul className="mt-3 space-y-2 text-sm text-gray-600">
                {classification.evidence.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-indigo-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <DetailStat label="Started" value={workshop.created_at ? format(new Date(workshop.created_at), 'MMM d, yyyy h:mm a') : 'Unknown'} />
              <DetailStat label="Ended" value={workshop.ended_at ? format(new Date(workshop.ended_at), 'MMM d, yyyy h:mm a') : (isActive ? 'In progress' : 'Unknown')} />
              <DetailStat label="Status" value={workshop.status || (isActive ? 'active' : 'ended')} />
              <DetailStat label="Conversation ID" value={`#${workshop.id}`} />
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {showReportDialog && reportData && (
        <ReportDownloadDialog
          isOpen={showReportDialog}
          onClose={() => setShowReportDialog(false)}
          onDownload={(fmt) => {
            const sessionData = { participantCount, messageCount, duration, engagementScore };
            downloadReport({ reportId: (reportData.id as string) || 'report', reportContent: reportData.report_content as string, sessionData }, fmt);
            setShowReportDialog(false);
          }}
          sessionData={{ participantCount, messageCount, duration, engagementScore }}
          sessionTitle={title}
          reportContent={reportData?.report_content as string}
        />
      )}

      <Sheet open={showDiagnostics} onOpenChange={setShowDiagnostics}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl lg:max-w-3xl">
          <SheetHeader className="mb-5 pr-8">
            <SheetTitle>Session diagnostics</SheetTitle>
            <SheetDescription>
              Review analytics, privacy-safe event logs, blockers, errors, and participant drop-off clues for “{title}”.
            </SheetDescription>
          </SheetHeader>
          {showDiagnostics && (
            <SessionAnalyticsDashboard
              conversationId={workshop.id}
              summarySnapshot={{
                participants: participantCount,
                currentParticipants: workshop.current_participants ?? null,
                attendeeCapacity,
                status: workshop.status ?? null,
                inactivityTimeoutMinutes: STALE_SESSION_TIMEOUT_MINUTES,
                messages: messageCount,
                durationMinutes: duration,
                createdAt: workshop.created_at ?? null,
                endedAt: workshop.ended_at ?? null,
              }}
              className="border-gray-100 shadow-none"
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};

const MetricPill = ({ icon, value, label, helper, highlight }: { icon: React.ReactNode; value: string | number; label: string; helper?: string; highlight?: 'emerald' | 'indigo' }) => (
  <div className="flex min-h-[4.75rem] flex-col items-center justify-center bg-gray-50 rounded-xl py-2 px-1 text-center" title={helper}>
    <span className={`${highlight === 'emerald' ? 'text-emerald-500' : highlight === 'indigo' ? 'text-indigo-500' : 'text-gray-400'} mb-0.5`}>{icon}</span>
    <span className={`text-sm font-bold ${highlight === 'emerald' ? 'text-emerald-600' : highlight === 'indigo' ? 'text-indigo-600' : 'text-gray-700'}`}>{value}</span>
    <span className="text-[10px] text-gray-500 font-medium leading-tight">{label}</span>
    {helper && <span className="mt-0.5 text-[9px] leading-tight text-gray-400">{helper}</span>}
  </div>
);

const DetailStat = ({ label, value }: { label: string; value: string | number }) => (
  <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
    <p className="mt-1 break-words text-sm font-medium text-gray-800">{value}</p>
  </div>
);

/* ── Skeleton / Error / Empty ── */
const LoadingState = () => (
  <div className="grid sm:grid-cols-2 gap-4">
    {[1, 2, 3, 4].map(i => (
      <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
        <div className="grid grid-cols-4 gap-2 pt-2">
          {[1,2,3,4].map(j => <Skeleton key={j} className="h-14 rounded-xl" />)}
        </div>
      </div>
    ))}
  </div>
);

const ErrorState = ({ error }: { error: Error }) => (
  <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
    <p className="text-red-600 font-semibold text-sm">Error loading workshops</p>
    <p className="text-red-400 text-xs mt-1">{error.message}</p>
  </div>
);

const EmptyState = ({ isActive = false, isSavedFilter = false }) => (
  <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-10 text-center">
    <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
      <LayoutDashboard size={22} className="text-indigo-400" />
    </div>
    <p className="text-gray-700 font-semibold text-sm">
      {isActive ? 'No active sessions' : isSavedFilter ? 'No saved sessions' : 'No past workshops yet'}
    </p>
    <p className="text-gray-400 text-xs mt-1">
      {isActive ? 'Start a new session to see it here' : isSavedFilter ? 'Bookmark sessions using the save icon' : 'Completed workshops will appear here'}
    </p>
  </div>
);

const Pagination = ({ currentPage, totalPages, onPageChange }: { currentPage: number; totalPages: number; onPageChange: (p: number) => void }) => {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-1.5 mt-8">
      <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40">
        <ChevronLeft size={16} />
      </button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
        <button key={p} onClick={() => onPageChange(p)} className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${p === currentPage ? 'bg-indigo-600 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
          {p}
        </button>
      ))}
      <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40">
        <ChevronRight size={16} />
      </button>
    </div>
  );
};

/* ── Main Page ── */
type FilterTab = 'all' | 'active' | 'saved';

const PastWorkshops = () => {
  const navigate = useNavigate();
  const { navigateToHostSession } = useNavigateToSession();
  const queryClient = useQueryClient();
  const { canGenerateReports, canSaveSessions } = usePlanLimits();
  const [pastPage, setPastPage] = useState(1);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  // past-workshops: completed sessions don't change — 60 s staleTime avoids
  // redundant fetches on every visit.  The realtime channel below invalidates
  // the cache immediately when a conversation is updated.
  const { data: pastWorkshops, isLoading: isPastLoading, error: pastError } = useQuery({
    queryKey: ['past-workshops'],
    queryFn: fetchPastWorkshops,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    refetchInterval: 30_000,
  });
  // active-workshops: live sessions can change; dashboard-wide realtime is not
  // supported by the conversation-scoped SSE shim, so polling keeps this fresh.
  const { data: activeWorkshops, isLoading: isActiveLoading, error: activeError } = useQuery({
    queryKey: ['active-workshops'],
    queryFn: fetchActiveWorkshops,
    staleTime: 2 * 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    refetchInterval: 30_000,
  });

  // canGenerateReports and canSaveSessions come directly from usePlanLimits above

  const ownerIds = Array.from(new Set([...(pastWorkshops || []), ...(activeWorkshops || [])].map(w => w.user_id).filter(Boolean)));
  const { data: ownerProfiles = [] } = useQuery({
    queryKey: ['past-workshop-owners', ownerIds.join(',')],
    enabled: ownerIds.length > 0,
    queryFn: async () => {
      const { data, error } = await api
        .from('profiles')
        .select('id, email, full_name, display_name')
        .in('id', ownerIds);

      if (error) throw error;
      return data as OwnerProfile[];
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const ownerById = new Map(ownerProfiles.map(profile => [profile.id, profile]));

  const filteredPast = activeTab === 'saved'
    ? (pastWorkshops || []).filter(w => w.is_saved)
    : (pastWorkshops || []);

  const totalPastPages = Math.ceil(filteredPast.length / ITEMS_PER_PAGE);
  const paginatedPast = filteredPast.slice((pastPage - 1) * ITEMS_PER_PAGE, pastPage * ITEMS_PER_PAGE);
  const pastIds = paginatedPast.map(w => w.id);
  const { data: reportsData = {} } = useWorkshopReports(pastIds);

  const handleSaveToggle = (id: number, saved: boolean) => {
    queryClient.setQueryData(['past-workshops'], (old: Workshop[] | undefined) =>
      old ? old.map(w => w.id === id ? { ...w, is_saved: saved } : w) : old
    );
  };

  useEffect(() => { clearAllParticipantState(); }, []);

  useEffect(() => {
    const auto = async () => {
      if (activeWorkshops?.length && window.location.search.includes('auto=true')) {
        await navigateToHostSession(activeWorkshops[0].id);
      }
    };
    auto();
  }, [activeWorkshops, navigateToHostSession]);

  // Aggregate stats
  const totalSessions = (pastWorkshops?.length || 0) + (activeWorkshops?.length || 0);
  const staleActiveSessions = (activeWorkshops || []).filter((w) => {
    const lastActivityAt = getMostRecentIso(w.updated_at, w.created_at);
    const lastActivityTime = parseTime(lastActivityAt);
    return lastActivityTime > 0 && (Date.now() - lastActivityTime) / 60_000 >= STALE_SESSION_TIMEOUT_MINUTES;
  }).length;
  // Use Math.max(0, ...) to guard against negative counts from race conditions.
  // Completed sessions use the saved final snapshot; active sessions use the live count.
  const totalParticipants = [
    ...(pastWorkshops || []).map(w => w.participants ?? w.current_participants ?? 0),
    ...(activeWorkshops || []).map(w => w.current_participants ?? w.participants ?? 0),
  ].reduce((s, count) => s + Math.max(0, count), 0);
  const totalMessages = [...(pastWorkshops || []), ...(activeWorkshops || [])].reduce((s, w) => s + (w.total_messages || 0), 0);
  // Only show avg engagement when at least one session has a real score
  const sessionsWithScore = (pastWorkshops || []).filter(w => (w.participant_engagement_score ?? 0) > 0);
  const avgEngagement = sessionsWithScore.length
    ? (sessionsWithScore.reduce((s, w) => s + (w.participant_engagement_score || 0), 0) / sessionsWithScore.length).toFixed(1)
    : '—';

  const filterTabs: { id: FilterTab; label: string; count?: number }[] = [
    { id: 'all', label: 'All Workshops', count: (pastWorkshops?.length || 0) + (activeWorkshops?.length || 0) },
    { id: 'active', label: 'Active', count: activeWorkshops?.length || 0 },
    { id: 'saved', label: 'Saved', count: (pastWorkshops || []).filter(w => w.is_saved).length },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/20 to-white pb-20">
      <PageHead title="Host Dashboard" description="Manage and view all your workshop sessions" />

      {/* ── Page Header ── */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-24 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
                <LayoutDashboard size={24} className="text-indigo-500" />
                Host Dashboard
              </h1>
              <p className="text-gray-500 text-sm mt-1">Manage sessions and track your facilitation impact</p>
            </div>
            <Button onClick={() => navigate('/my-facilitators')} className="rounded-full bg-indigo-600 hover:bg-indigo-700 gap-2 w-full sm:w-auto">
              <PlusCircle size={16} />
              New Session
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8">

        {/* ── Stats Bar ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Total Sessions', value: totalSessions, icon: <LayoutDashboard size={16} className="text-indigo-400" /> },
            { label: 'Participants', value: totalParticipants, icon: <Users size={16} className="text-violet-400" /> },
            { label: 'Messages', value: totalMessages, icon: <MessageSquare size={16} className="text-sky-400" /> },
            { label: 'Avg Engagement', value: avgEngagement, icon: <Activity size={16} className="text-emerald-400" /> },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4">
              <div className="flex items-center gap-2 mb-1">{s.icon}<span className="text-xs text-gray-400 font-medium uppercase tracking-wide">{s.label}</span></div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="mb-6 rounded-2xl border border-indigo-100 bg-white/80 p-4 text-sm text-gray-600 shadow-sm">
          <p className="font-semibold text-gray-800">How to read this dashboard</p>
          <p className="mt-1">
Past workshop cards show the saved end-of-session snapshot plus session-intelligence badges: likely session type, who started it, and whether it was scheduled or ad hoc. Use View for a narrative summary, and Diagnostics for raw event troubleshooting where reconnects can appear as extra join events.
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Sessions with no messages or diagnostic activity for {STALE_SESSION_TIMEOUT_MINUTES} minutes are automatically closed and moved out of Active Sessions on refresh.
            {staleActiveSessions > 0 ? ` ${staleActiveSessions} stale active session${staleActiveSessions === 1 ? '' : 's'} will be cleaned up on the next refresh.` : ''}
          </p>
        </div>

        {/* ── Filter Tabs ── */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
          {filterTabs.map(t => (
            <button
              key={t.id}
              onClick={() => { setActiveTab(t.id); setPastPage(1); }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === t.id ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {t.label}
              {t.count !== undefined && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${activeTab === t.id ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-200 text-gray-500'}`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Active Sessions (shown in "Active" tab or inline at top of "All") ── */}
        {(activeTab === 'active' || activeTab === 'all') && (
          <div className="mb-8">
            {activeTab === 'all' && activeWorkshops && activeWorkshops.length > 0 && (
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Active Sessions</h2>
            )}
            {isActiveLoading ? <LoadingState /> : activeError ? <ErrorState error={activeError as Error} /> :
              activeTab === 'active' && !activeWorkshops?.length ? <EmptyState isActive={true} /> :
              activeWorkshops && activeWorkshops.length > 0 ? (
                <div className="grid sm:grid-cols-2 gap-4">
                  {activeWorkshops.map(w => (
                    <WorkshopCard
                      key={w.id}
                      workshop={w}
                      isActive={true}
                      canGenerateReports={canGenerateReports}
                      canSaveSessions={canSaveSessions}
                      ownerProfile={ownerById.get(w.user_id)}
                    />
                  ))}
                </div>
              ) : null
            }
          </div>
        )}

        {/* ── Past Workshops ── */}
        {(activeTab === 'all' || activeTab === 'saved') && (
          <div>
            {activeTab === 'all' && (
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Past Workshops</h2>
            )}
            {isPastLoading ? <LoadingState /> : pastError ? <ErrorState error={pastError as Error} /> :
              !filteredPast.length ? <EmptyState isSavedFilter={activeTab === 'saved'} /> : (
                <>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {paginatedPast.map(w => (
                      <WorkshopCard
                        key={w.id}
                        workshop={w}
                        isActive={false}
                        canGenerateReports={canGenerateReports}
                        canSaveSessions={canSaveSessions}
                        reportData={reportsData[w.id]}
                        onSaveToggle={handleSaveToggle}
                        ownerProfile={ownerById.get(w.user_id)}
                      />
                    ))}
                  </div>
                  <Pagination currentPage={pastPage} totalPages={totalPastPages} onPageChange={setPastPage} />
                </>
              )
            }
          </div>
        )}
      </div>
    </div>
  );
};

export default PastWorkshops;
