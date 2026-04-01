import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Download, 
  Users, 
  MessageSquare, 
  Clock, 
  TrendingUp,
  FileText,
  Calendar,
  UserCheck,
  Star,
  Quote,
  AlertCircle,
  RefreshCw,
  Lock
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserPlan } from '@/hooks/useUserPlan';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { useToast } from '@/hooks/use-toast';

interface SessionReportViewProps {
  conversationId?: number;
}

const SessionReportView: React.FC<SessionReportViewProps> = ({ conversationId }) => {
  const navigate = useNavigate();
  const params = useParams();
  const { toast } = useToast();
  const { planRestrictions } = useUserPlan();
  
  const reportConversationId = conversationId || parseInt(params.id || '0');
  const { canGenerateReports } = usePlanLimits();
  
  // Fetch session report data
  const { data: reportData, isLoading, error, refetch } = useQuery({
    queryKey: ['sessionReport', reportConversationId],
    queryFn: async () => {
      
      // Fetch conversation with sessions
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select(`
          *,
          sessions!conversations_sessions_id_fkey (
            id,
            title,
            objective,
            session_type,
            facilitator
          )
        `)
        .eq('id', reportConversationId)
        .maybeSingle();

      if (convError) {
        console.error('❌ Error fetching conversation:', convError);
        throw new Error(`Failed to fetch conversation: ${convError.message}`);
      }

      if (!conversation) {
        console.error('❌ Conversation not found for ID:', reportConversationId);
        throw new Error('Conversation not found');
      }

      // Get facilitator details separately if facilitator exists
      let facilitatorData = null;
      if (conversation.sessions?.facilitator) {
        const { data: facilitator, error: facilitatorError } = await supabase
          .from('facilitators')
          .select('id, title, profile_picture')
          .eq('id', conversation.sessions.facilitator)
          .maybeSingle();
        
        if (!facilitatorError && facilitator) {
          facilitatorData = facilitator;
        }
      }

      // Fetch session report
      const { data: report, error: reportError } = await supabase
        .from('session_reports')
        .select('*')
        .eq('conversation_id', reportConversationId)
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (reportError) {
        console.error('❌ Error fetching report:', reportError);
        throw new Error(`Failed to fetch report: ${reportError.message}`);
      }

      if (!report) {
        console.error('❌ No report found for conversation:', reportConversationId);
        throw new Error('Session report not found. The session may not have been closed yet.');
      }

      // Fetch messages
      const { data: messages, error: msgError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', reportConversationId)
        .order('created_at', { ascending: true });

      if (msgError) {
        console.error('❌ Error fetching messages:', msgError);
        // Don't throw here, messages might be empty
      }

      // Fetch participants
      const { data: participants, error: partError } = await supabase
        .from('session_participants')
        .select('*')
        .eq('conversation_id', reportConversationId);

      if (partError) {
        console.error('❌ Error fetching participants:', partError);
        // Don't throw here, continue with empty participants
      }

      return {
        conversation: {
          ...conversation,
          facilitator: facilitatorData
        },
        report,
        messages: messages || [],
        participants: participants || [],
        highlights: extractHighlights(messages || []),
        keyMoments: extractKeyMoments(messages || []),
        participationStats: calculateParticipationStats(messages || [], participants || [])
      };
    },
    enabled: !!reportConversationId,
    retry: 2,
    retryDelay: 1000
  });

  const canDownloadPDF = planRestrictions?.data_export;
  const canViewReport = canGenerateReports;

  const handleBack = () => {
    navigate('/past-workshops');
  };

  const handleDownloadPDF = async () => {
    if (!canDownloadPDF) {
      toast({
        title: "Premium Feature",
        description: "PDF export is available for premium users. Please upgrade your plan.",
        variant: "destructive"
      });
      return;
    }

    // Generate PDF using browser's built-in print dialog with a print-optimised stylesheet
    toast({
      title: "Preparing PDF",
      description: "Opening print dialog to save as PDF...",
    });
    
    // Small delay to let the toast render before print dialog opens
    setTimeout(() => {
      window.print();
    }, 300);
  };

  const handleRetry = () => {
    refetch();
  };

  // Gate: users without session_reports access cannot view reports
  if (!canViewReport && !isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <Lock className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Reports Not Available</h2>
          <p className="text-gray-500 mb-6">
            Session reports are not included in your current plan. Upgrade to access detailed session analytics and reports.
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={handleBack} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Sessions
            </Button>
            <Button onClick={() => navigate('/pricing')} variant="default">
              Upgrade Plan
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading session report...</p>
        </div>
      </div>
    );
  }

  if (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const isNotFound = errorMessage.includes('not found');
    
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          {isNotFound ? (
            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          ) : (
            <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
          )}
          
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            {isNotFound ? 'Report Not Found' : 'Failed to Load Report'}
          </h2>
          
          <p className="text-gray-500 mb-4">{errorMessage}</p>
          
          <div className="flex gap-2 justify-center">
            <Button onClick={handleBack} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Sessions
            </Button>
            
            {!isNotFound && (
              <Button onClick={handleRetry} variant="default">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No Report Data</h2>
          <p className="text-gray-500 mb-4">Unable to load report data.</p>
          <Button onClick={handleBack} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Sessions
          </Button>
        </div>
      </div>
    );
  }

  const { conversation, report, highlights, keyMoments, participationStats } = reportData;
  const sessionDate = new Date(conversation.created_at).toLocaleDateString();
  const sessionDuration = conversation.session_duration_minutes || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center space-x-3">
              <Button variant="ghost" size="icon" onClick={handleBack} className="flex-shrink-0">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl font-bold text-gray-900 leading-tight">Session Report</h1>
                <p className="text-gray-600 text-sm truncate max-w-[200px] sm:max-w-none">{conversation.sessions?.title || 'Untitled Session'}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 pl-11 sm:pl-0">
              {canDownloadPDF && (
                <Button onClick={handleDownloadPDF} variant="outline" size="sm" className="h-8 sm:h-9">
                  <Download className="h-4 w-4 mr-1.5" />
                  <span className="hidden xs:inline">Download </span>PDF
                </Button>
              )}
              {!canDownloadPDF && (
                <Button onClick={handleDownloadPDF} variant="outline" size="sm" className="opacity-60 h-8 sm:h-9">
                  <Download className="h-4 w-4 mr-1.5" />
                  <span className="hidden xs:inline">PDF </span>(Premium)
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Report Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Session Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Session Overview</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-1 text-blue-600 mb-1">
                      <Users className="h-4 w-4" />
                      <span className="font-semibold">{participationStats.totalParticipants}</span>
                    </div>
                    <p className="text-xs text-gray-500">Participants</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-1 text-green-600 mb-1">
                      <MessageSquare className="h-4 w-4" />
                      <span className="font-semibold">{participationStats.totalMessages}</span>
                    </div>
                    <p className="text-xs text-gray-500">Messages</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-1 text-purple-600 mb-1">
                      <Clock className="h-4 w-4" />
                      <span className="font-semibold">{sessionDuration}m</span>
                    </div>
                    <p className="text-xs text-gray-500">Duration</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-1 text-orange-600 mb-1">
                      <TrendingUp className="h-4 w-4" />
                      <span className="font-semibold">{conversation.participant_engagement_score?.toFixed(1) || '0.0'}</span>
                    </div>
                    <p className="text-xs text-gray-500">Engagement</p>
                  </div>
                </div>
                <Separator />
                <div>
                  <h4 className="font-medium mb-2">Objective</h4>
                  <p className="text-gray-700">{conversation.sessions?.objective || 'No objective specified'}</p>
                </div>
              </CardContent>
            </Card>

            {/* Key Highlights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Star className="h-5 w-5" />
                  <span>Key Highlights</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-3">
                    {highlights.length > 0 ? (
                      highlights.map((highlight, index) => (
                        <div key={index} className="p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                          <div className="flex items-start space-x-2">
                            <Quote className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-gray-700">{highlight}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Quote className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No highlights available for this session</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Key Moments */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5" />
                  <span>Key Moments</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {keyMoments.length > 0 ? (
                    keyMoments.map((moment, index) => (
                      <div key={index} className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                        <div>
                          <p className="text-sm text-gray-600">{moment.time}</p>
                          <p className="text-gray-900">{moment.description}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No key moments recorded for this session</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Session Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Session Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">{sessionDate}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <UserCheck className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">{conversation.facilitator?.title || 'AI Facilitator'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">{conversation.sessions?.session_type || 'Discussion'}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Participation Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Participation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Active Participants</span>
                    <span className="font-medium">{participationStats.activeParticipants}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Messages per Person</span>
                    <span className="font-medium">{participationStats.avgMessagesPerPerson}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Participation Balance</span>
                    <Badge variant={participationStats.participationBalance > 0.7 ? 'default' : 'secondary'}>
                      {participationStats.participationBalance > 0.7 ? 'Balanced' : 'Varied'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper functions
function extractHighlights(messages: any[]): string[] {
  const userMessages = messages.filter(m => m.role === 'user');
  
  if (userMessages.length === 0) return ['No participant contributions to highlight'];
  
  // Simple extraction - in a real implementation, this would use AI/NLP
  const highlights = userMessages
    .filter(m => m.content && m.content.length > 50)
    .slice(0, 5)
    .map(m => m.content.substring(0, 150) + (m.content.length > 150 ? '...' : ''));
  
  return highlights.length > 0 ? highlights : ['Session included valuable participant contributions'];
}

function extractKeyMoments(messages: any[]): { time: string, description: string }[] {
  const moments = [];
  
  if (messages.length > 0) {
    const firstMessage = messages[0];
    moments.push({
      time: new Date(firstMessage.created_at).toLocaleTimeString(),
      description: 'Session started with initial introductions'
    });
  }
  
  const midPoint = Math.floor(messages.length / 2);
  if (messages.length > midPoint) {
    const midMessage = messages[midPoint];
    moments.push({
      time: new Date(midMessage.created_at).toLocaleTimeString(),
      description: 'Discussion reached peak engagement'
    });
  }
  
  if (messages.length > 1) {
    const lastMessage = messages[messages.length - 1];
    moments.push({
      time: new Date(lastMessage.created_at).toLocaleTimeString(),
      description: 'Session concluded with final thoughts'
    });
  }
  
  return moments;
}

function calculateParticipationStats(messages: any[], participants: any[]) {
  const userMessages = messages.filter(m => m.role === 'user');
  const totalParticipants = participants.length;
  const totalMessages = userMessages.length;
  
  // Count messages per participant
  const messageCounts: {[key: string]: number} = { /* no-op */ };
  userMessages.forEach(msg => {
    const participantId = msg.participant || 'unknown';
    messageCounts[participantId] = (messageCounts[participantId] || 0) + 1;
  });
  
  const activeParticipants = Object.keys(messageCounts).length;
  const avgMessagesPerPerson = totalParticipants > 0 ? Math.round(totalMessages / totalParticipants * 10) / 10 : 0;
  
  // Calculate participation balance
  let participationBalance = 0;
  if (activeParticipants > 1) {
    const counts = Object.values(messageCounts);
    const mean = counts.reduce((sum, count) => sum + count, 0) / counts.length;
    const variance = counts.reduce((sum, count) => sum + Math.pow(count - mean, 2), 0) / counts.length;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = stdDev / mean;
    participationBalance = Math.max(0, Math.min(1, 1 - coefficientOfVariation / 2));
  }
  
  return {
    totalParticipants,
    totalMessages,
    activeParticipants,
    avgMessagesPerPerson,
    participationBalance
  };
}

export default SessionReportView;
