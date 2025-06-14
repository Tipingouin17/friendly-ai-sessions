
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
  Quote
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserPlan } from '@/hooks/useUserPlan';
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
  
  // Fetch session report data
  const { data: reportData, isLoading } = useQuery({
    queryKey: ['sessionReport', reportConversationId],
    queryFn: async () => {
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select(`
          *,
          sessions!conversations_sessions_id_fkey (
            id,
            title,
            objective,
            session_type
          ),
          facilitators!conversations_facilitator_id_fkey (
            id,
            title,
            avatar_url
          )
        `)
        .eq('id', reportConversationId)
        .single();

      if (convError) throw convError;

      const { data: report, error: reportError } = await supabase
        .from('session_reports')
        .select('*')
        .eq('conversation_id', reportConversationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (reportError) throw reportError;

      const { data: messages, error: msgError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', reportConversationId)
        .order('created_at', { ascending: true });

      if (msgError) throw msgError;

      const { data: participants, error: partError } = await supabase
        .from('session_participants')
        .select('*')
        .eq('conversation_id', reportConversationId);

      if (partError) throw partError;

      return {
        conversation,
        report,
        messages,
        participants,
        highlights: extractHighlights(messages),
        keyMoments: extractKeyMoments(messages),
        participationStats: calculateParticipationStats(messages, participants)
      };
    },
    enabled: !!reportConversationId
  });

  const canDownloadPDF = planRestrictions?.data_export;

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

    // TODO: Implement PDF generation
    toast({
      title: "PDF Export",
      description: "PDF export functionality will be implemented soon.",
    });
  };

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

  if (!reportData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Report Not Found</h2>
          <p className="text-gray-500 mb-4">The session report could not be loaded.</p>
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
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="icon" onClick={handleBack}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Session Report</h1>
                <p className="text-gray-600">{conversation.sessions?.title || 'Untitled Session'}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {canDownloadPDF && (
                <Button onClick={handleDownloadPDF} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
              )}
              {!canDownloadPDF && (
                <Button onClick={handleDownloadPDF} variant="outline" className="opacity-60">
                  <Download className="h-4 w-4 mr-2" />
                  PDF (Premium)
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
                    {highlights.map((highlight, index) => (
                      <div key={index} className="p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                        <div className="flex items-start space-x-2">
                          <Quote className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-gray-700">{highlight}</p>
                        </div>
                      </div>
                    ))}
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
                  {keyMoments.map((moment, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      <div>
                        <p className="text-sm text-gray-600">{moment.time}</p>
                        <p className="text-gray-900">{moment.description}</p>
                      </div>
                    </div>
                  ))}
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
                  <span className="text-sm">{conversation.facilitators?.title || 'AI Facilitator'}</span>
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
  const messageCounts: {[key: string]: number} = {};
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
