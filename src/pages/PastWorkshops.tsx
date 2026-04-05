/**
 * Past Workshops
 *
 * Page for the AIfacilitator application.
 */
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Calendar, PlusCircle, LayoutDashboard, Download, ChevronLeft, ChevronRight, Bookmark, BookmarkCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { format, differenceInMinutes } from "date-fns";
import { Workshop } from "@/types/database";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useNavigateToSession } from "@/hooks/session-joining/useNavigateToSession";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useWorkshopReports } from "@/hooks/useWorkshopReports";
import { useReportDownloader } from "@/hooks/session-closure/useReportDownloader";
import ReportDownloadDialog from "@/components/session/ReportDownloadDialog";
import WorkshopMetrics from "@/components/session/WorkshopMetrics";
import FacilitatorInfo from "@/components/session/FacilitatorInfo";
import WorkshopTags from "@/components/session/WorkshopTags";
import PageHead from "@/components/PageHead";
import { useToast } from "@/components/ui/use-toast";

const ITEMS_PER_PAGE = 12;

/**
 * Calculate workshop duration from timestamps.
 * Falls back to session_duration_minutes if available,
 * otherwise calculates from created_at to ended_at.
 */
const calculateDuration = (workshop: Workshop): number => {
  if (workshop.session_duration_minutes && workshop.session_duration_minutes > 0) {
    return workshop.session_duration_minutes;
  }
  if (workshop.created_at && workshop.ended_at) {
    const minutes = differenceInMinutes(
      new Date(workshop.ended_at),
      new Date(workshop.created_at)
    );
    return Math.max(1, minutes); // At least 1 minute
  }
  return 0;
};

/**
 * Get a meaningful workshop title.
 * Uses session title, then facilitator name, then a date-based fallback.
 */
const getWorkshopTitle = (workshop: Workshop): string => {
  if (workshop.sessions?.title && workshop.sessions.title !== 'Untitled Workshop') {
    return workshop.sessions.title;
  }
  if (workshop.sessions?.facilitators?.title) {
    return `${workshop.sessions.facilitators.title} Session`;
  }
  if (workshop.sessions?.objective) {
    const obj = workshop.sessions.objective;
    return obj.length > 50 ? `${obj.slice(0, 47)}...` : obj;
  }
  if (workshop.created_at) {
    return `Workshop ${format(new Date(workshop.created_at), 'MMM d, yyyy')}`;
  }
  return 'Workshop';
};

const fetchPastWorkshops = async () => {
  const { data, error } = await supabase
    .from('conversations')
    .select(`
      *,
      sessions!conversations_sessions_id_fkey (
        title,
        facilitator,
        objective,
        difficulty_level,
        tags,
        facilitators!sessions_facilitator_fkey (
          title,
          profile_picture
        )
      ),
      messages!messages_conversation_id_fkey (id, role)
    `)
    .eq('is_session_ended', true)
    .order('ended_at', { ascending: false });

  if (error) throw error;

  // Enrich each workshop with live message count if the stored value is stale (0)
  const enriched = (data || []).map((w: Workshop & { messages?: { id: number; role: string }[] }) => {
    const liveMessageCount = w.messages?.length ?? 0;
    const storedCount = w.total_messages ?? 0;
    return {
      ...w,
      total_messages: storedCount > 0 ? storedCount : liveMessageCount,
      messages: undefined, // strip raw messages from the object
    };
  });

  return enriched as Workshop[];
};

const fetchActiveWorkshops = async () => {
  const { data, error } = await supabase
    .from('conversations')
    .select(`
      *,
      sessions!conversations_sessions_id_fkey (
        title,
        facilitator,
        objective,
        difficulty_level,
        tags,
        facilitators!sessions_facilitator_fkey (
          title,
          profile_picture
        )
      )
    `)
    .eq('is_session_ended', false)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Workshop[];
};

const WorkshopCard = ({ workshop, isActive, canGenerateReports, canSaveSessions, reportData, onSaveToggle }: {
  workshop: Workshop,
  isActive: boolean,
  canGenerateReports: boolean,
  canSaveSessions: boolean,
  reportData?: Record<string, unknown>,
  onSaveToggle?: (workshopId: number, isSaved: boolean) => void
}) => {
  const { navigateToHostSession } = useNavigateToSession();
  const { downloadReport } = useReportDownloader();
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleHostView = async () => {
    if (isActive) {
      await navigateToHostSession(workshop.id);
    }
  };

  const handleDownloadReport = () => {
    if (reportData) {
      setShowReportDialog(true);
    }
  };

  const handleSaveToggle = async () => {
    if (!canSaveSessions) {
      toast({
        title: "Upgrade required",
        description: "Save Sessions is available on Starter and Premium plans.",
        variant: "destructive",
      });
      return;
    }
    setIsSaving(true);
    const newSavedState = !workshop.is_saved;
    const { error } = await supabase
      .from('conversations')
      .update({ is_saved: newSavedState })
      .eq('id', workshop.id);
    setIsSaving(false);
    if (error) {
      toast({ title: "Error", description: "Failed to update saved status.", variant: "destructive" });
    } else {
      toast({
        title: newSavedState ? "Session saved" : "Session unsaved",
        description: newSavedState ? "Session has been saved to your library." : "Session removed from saved library.",
      });
      onSaveToggle?.(workshop.id, newSavedState);
    }
  };

  const participantCount = workshop.participants || 0;
  const messageCount = workshop.total_messages || 0;
  const duration = calculateDuration(workshop);
  const title = getWorkshopTitle(workshop);

  const truncateText = (text: string, maxLength: number) => {
    return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
  };

  // Only show download report if there are actual messages
  const hasContent = messageCount > 0;

  return (
    <>
      <Card className={isActive ? "border-green-300 bg-green-50/30" : "hover:shadow-md transition-shadow"}>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-lg font-semibold mb-2">
                  {title}
                </CardTitle>
                {!isActive && (
                  <button
                    onClick={handleSaveToggle}
                    disabled={isSaving}
                    title={canSaveSessions ? (workshop.is_saved ? "Unsave session" : "Save session") : "Upgrade to save sessions"}
                    className={`flex-shrink-0 p-1 rounded transition-colors ${
                      canSaveSessions
                        ? workshop.is_saved
                          ? "text-primary hover:text-primary/70"
                          : "text-gray-400 hover:text-primary"
                        : "text-gray-300 cursor-not-allowed"
                    }`}
                  >
                    {workshop.is_saved
                      ? <BookmarkCheck className="w-5 h-5" />
                      : <Bookmark className="w-5 h-5" />
                    }
                  </button>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center text-gray-500 text-sm">
                  <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span>{format(new Date(workshop.created_at), 'PPP')}</span>
                </div>
                <FacilitatorInfo
                  facilitatorName={workshop.sessions?.facilitators?.title}
                  facilitatorAvatar={workshop.sessions?.facilitators?.profile_picture}
                />
              </div>
            </div>
          </div>

          <WorkshopTags
            difficulty={workshop.sessions?.difficulty_level}
            tags={workshop.sessions?.tags}
            isActive={isActive}
          />
        </CardHeader>

        <CardContent className="pt-0">
          {workshop.sessions?.objective && (
            <p className="text-gray-600 text-sm mb-3 leading-relaxed">
              {truncateText(workshop.sessions.objective, 120)}
            </p>
          )}

          {workshop.participant_description && (
            <p className="text-gray-500 text-xs mb-3 italic">
              "{truncateText(workshop.participant_description, 80)}"
            </p>
          )}

          <WorkshopMetrics
            participantCount={participantCount}
            messageCount={messageCount}
            duration={duration}
            engagementScore={workshop.participant_engagement_score || 0}
          />

          <div className="flex flex-wrap justify-between items-center mt-4 gap-2">
            <div className="text-sm text-gray-500">
              {workshop.ended_at ? (
                <span>Completed {format(new Date(workshop.ended_at), 'PP')}</span>
              ) : (
                <span className="text-green-600 font-medium">In progress</span>
              )}
            </div>

            <div className="flex gap-2">
              {isActive && (
                <Button size="sm" onClick={handleHostView} className="bg-primary hover:bg-primary/90">
                  Manage Session
                </Button>
              )}
              {!isActive && canGenerateReports && reportData && hasContent && (
                <Button size="sm" variant="outline" onClick={handleDownloadReport}>
                  <Download className="w-4 h-4 mr-2" />
                  Download Report
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {showReportDialog && reportData && (
        <ReportDownloadDialog
          isOpen={showReportDialog}
          onClose={() => setShowReportDialog(false)}
          onDownload={(fmt) => {
            const sessionData = {
              participantCount: workshop.participants || 0,
              messageCount: workshop.total_messages || 0,
              duration: duration,
              engagementScore: workshop.participant_engagement_score || 0,
            };

            const closureResult = {
              reportId: (reportData as Record<string, unknown>).id as string || 'report',
              reportContent: (reportData as Record<string, unknown>).report_content as string,
              sessionData
            };

            downloadReport(closureResult, fmt);
            setShowReportDialog(false);
          }}
          sessionData={{
            participantCount: workshop.participants || 0,
            messageCount: workshop.total_messages || 0,
            duration: duration,
            engagementScore: workshop.participant_engagement_score || 0,
          }}
          sessionTitle={title}
          reportContent={(reportData as Record<string, unknown>)?.report_content as string}
        />
      )}
    </>
  );
};

const LoadingState = () => (
  <div className="space-y-4">
    {[1, 2, 3].map((i) => (
      <Card key={i}>
        <CardHeader className="pb-4">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-1/3 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="flex justify-between">
            <div className="space-y-2 w-2/3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <Skeleton className="h-4 w-24" />
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

const ErrorState = ({ error }: { error: Error }) => (
  <Card className="p-6 bg-red-50 border-red-200">
    <p className="text-red-600 font-medium">Error loading workshops</p>
    <p className="text-red-500 text-sm mt-1">{error.message}</p>
  </Card>
);

const EmptyState = ({ isActive = false, isSavedFilter = false }) => (
  <Card className="p-6">
    <div className="text-center space-y-2">
      <p className="text-gray-500 font-medium">
        {isActive ? "No active sessions found" : isSavedFilter ? "No saved sessions found" : "No past workshops found"}
      </p>
      <p className="text-gray-400 text-sm">
        {isActive ? "Start a new session to see it here" : isSavedFilter ? "Save sessions using the bookmark icon" : "Completed workshops will appear here"}
      </p>
    </div>
  </Card>
);

/**
 * Pagination component for workshop lists.
 */
const Pagination = ({ currentPage, totalPages, onPageChange }: {
  currentPage: number,
  totalPages: number,
  onPageChange: (page: number) => void
}) => {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {pages.map((page) => (
        <Button
          key={page}
          variant={page === currentPage ? "default" : "outline"}
          size="sm"
          onClick={() => onPageChange(page)}
          className="min-w-[36px]"
        >
          {page}
        </Button>
      ))}

      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
};

const PastWorkshops = () => {
  const navigate = useNavigate();
  const { navigateToHostSession } = useNavigateToSession();
  const queryClient = useQueryClient();
  const { planRestrictions } = useUserPlan();
  const [pastPage, setPastPage] = useState(1);
  const [showSavedOnly, setShowSavedOnly] = useState(false);

  const { data: pastWorkshops, isLoading: isPastLoading, error: pastError } = useQuery({
    queryKey: ['past-workshops'],
    queryFn: fetchPastWorkshops,
  });

  const { data: activeWorkshops, isLoading: isActiveLoading, error: activeError } = useQuery({
    queryKey: ['active-workshops'],
    queryFn: fetchActiveWorkshops,
  });

  // Check plan features
  const canGenerateReports = !!planRestrictions?.session_reports;
  const canSaveSessions = !!planRestrictions?.saved_sessions;

  // Filter past workshops based on saved filter
  const filteredPastWorkshops = showSavedOnly
    ? (pastWorkshops || []).filter(w => w.is_saved)
    : (pastWorkshops || []);

  // Get conversation IDs for fetching reports (only for current page)
  const totalPastPages = Math.ceil(filteredPastWorkshops.length / ITEMS_PER_PAGE);
  const paginatedPastWorkshops = filteredPastWorkshops.slice(
    (pastPage - 1) * ITEMS_PER_PAGE,
    pastPage * ITEMS_PER_PAGE
  );
  const pastWorkshopIds = paginatedPastWorkshops.map(w => w.id);
  const { data: reportsData = { /* no-op */ } } = useWorkshopReports(pastWorkshopIds);

  // Handle save toggle - update local cache optimistically
  const handleSaveToggle = (workshopId: number, isSaved: boolean) => {
    queryClient.setQueryData(['past-workshops'], (old: Workshop[] | undefined) => {
      if (!old) return old;
      return old.map(w => w.id === workshopId ? { ...w, is_saved: isSaved } : w);
    });
  };

  // Set up real-time listener for workshop status changes
  useEffect(() => {
    const channel = supabase
      .channel('workshops-realtime')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'conversations'
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['past-workshops'] });
        queryClient.invalidateQueries({ queryKey: ['active-workshops'] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Handle auto-navigation to most recent active session
  useEffect(() => {
    const handleAutoNavigation = async () => {
      if (activeWorkshops && activeWorkshops.length > 0 && window.location.search.includes('auto=true')) {
        const mostRecentSession = activeWorkshops[0];
        await navigateToHostSession(mostRecentSession.id);
      }
    };
    handleAutoNavigation();
  }, [activeWorkshops, navigateToHostSession]);

  const handleCreateNew = () => {
    navigate('/my-facilitators');
  };

  return (
    <div className="min-h-screen pt-12 pb-16">
      <PageHead title="Host Dashboard" description="Manage and view all your workshop sessions" />
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold flex items-center gap-2">
              <LayoutDashboard className="h-6 w-6 sm:h-8 sm:w-8" />
              Host Dashboard
            </h1>
            <p className="text-gray-500 mt-2 text-sm sm:text-base">Manage and view all your session data</p>
          </div>
          <Button onClick={handleCreateNew} className="flex items-center gap-2 w-full sm:w-auto">
            <PlusCircle className="h-4 w-4" />
            Create New Session
          </Button>
        </div>

        <h2 className="text-2xl font-semibold mb-4">Active Sessions</h2>
        {isActiveLoading ? (
          <LoadingState />
        ) : activeError ? (
          <ErrorState error={activeError as Error} />
        ) : !activeWorkshops?.length ? (
          <EmptyState isActive={true} />
        ) : (
          <div className="space-y-4 mb-8">
            {activeWorkshops.map((workshop) => (
              <WorkshopCard
                key={workshop.id}
                workshop={workshop}
                isActive={true}
                canGenerateReports={canGenerateReports}
                canSaveSessions={canSaveSessions}
              />
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mt-12 mb-4">
          <h2 className="text-2xl font-semibold">Past Workshops</h2>
          <div className="flex items-center gap-3">
            {pastWorkshops && pastWorkshops.length > 0 && (
              <span className="text-sm text-gray-500">
                {filteredPastWorkshops.length} workshop{filteredPastWorkshops.length !== 1 ? 's' : ''}
              </span>
            )}
            {canSaveSessions && (
              <Button
                variant={showSavedOnly ? "default" : "outline"}
                size="sm"
                onClick={() => { setShowSavedOnly(!showSavedOnly); setPastPage(1); }}
                className="flex items-center gap-1.5"
              >
                <BookmarkCheck className="w-4 h-4" />
                {showSavedOnly ? "Show All" : "Saved Only"}
              </Button>
            )}
          </div>
        </div>

        {isPastLoading ? (
          <LoadingState />
        ) : pastError ? (
          <ErrorState error={pastError as Error} />
        ) : !filteredPastWorkshops.length ? (
          <EmptyState isSavedFilter={showSavedOnly} />
        ) : (
          <>
            <div className="space-y-4">
              {paginatedPastWorkshops.map((workshop) => (
                <WorkshopCard
                  key={workshop.id}
                  workshop={workshop}
                  isActive={false}
                  canGenerateReports={canGenerateReports}
                  canSaveSessions={canSaveSessions}
                  reportData={reportsData[workshop.id]}
                  onSaveToggle={handleSaveToggle}
                />
              ))}
            </div>
            <Pagination
              currentPage={pastPage}
              totalPages={totalPastPages}
              onPageChange={setPastPage}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default PastWorkshops;
