/**
 * Session Analytics Dashboard
 *
 * Session component for the AIfacilitator application.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSessionAnalytics } from '@/hooks/useSessionAnalytics';
import { 
  Users, 
  MessageSquare, 
  Bot, 
  Shield, 
  Clock, 
  TrendingUp,
  AlertTriangle 
} from 'lucide-react';

interface SessionAnalyticsDashboardProps {
  conversationId: number;
  className?: string;
}

const SessionAnalyticsDashboard: React.FC<SessionAnalyticsDashboardProps> = ({
  conversationId,
  className = ""
}) => {
  const { analytics, isLoading, error } = useSessionAnalytics({ 
    conversationId, 
    realtime: true 
  });

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Session Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Analytics Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">{error}</p>
        </CardContent>
      </Card>
    );
  }

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Session Analytics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Participant Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-500" />
            <div className="text-sm">
              <div className="font-medium">Participants</div>
              <div className="text-gray-600">
                {analytics.participantJoins} joined, {analytics.participantLeaves} left
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-green-500" />
            <div className="text-sm">
              <div className="font-medium">Messages</div>
              <div className="text-gray-600">{analytics.messagesSent} sent</div>
            </div>
          </div>
        </div>

        {/* AI & Admin Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-purple-500" />
            <div className="text-sm">
              <div className="font-medium">AI Responses</div>
              <div className="text-gray-600">
                {analytics.aiResponses} ({analytics.averageResponseTime}ms avg)
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-orange-500" />
            <div className="text-sm">
              <div className="font-medium">Admin Actions</div>
              <div className="text-gray-600">{analytics.adminActions} taken</div>
            </div>
          </div>
        </div>

        {/* Session Performance */}
        <div className="space-y-2 pt-2 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">Duration</span>
            </div>
            <span className="text-sm text-gray-600">
              {formatDuration(analytics.sessionDuration)}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Engagement Score</span>
            <Badge variant={analytics.engagementScore > 2 ? "default" : "secondary"}>
              {analytics.engagementScore}/participant
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Total Events</span>
            <Badge variant="outline">{analytics.totalEvents}</Badge>
          </div>

          {analytics.errorCount > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="text-sm font-medium text-red-600">Errors</span>
              </div>
              <Badge variant="destructive">{analytics.errorCount}</Badge>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SessionAnalyticsDashboard;
