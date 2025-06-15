
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, MessageSquare, Clock, TrendingUp } from "lucide-react";

interface SessionAnalyticsDashboardProps {
  conversationId: number;
  className?: string;
}

const SessionAnalyticsDashboard: React.FC<SessionAnalyticsDashboardProps> = ({ 
  conversationId, 
  className 
}) => {
  // Placeholder analytics data - this would be fetched from the database
  const analyticsData = {
    totalParticipants: 8,
    totalMessages: 24,
    sessionDuration: 45,
    engagementScore: 8.2
  };

  return (
    <div className={className}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Participants</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.totalParticipants}</div>
            <p className="text-xs text-muted-foreground">
              Active in session
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.totalMessages}</div>
            <p className="text-xs text-muted-foreground">
              Total responses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.sessionDuration}m</div>
            <p className="text-xs text-muted-foreground">
              Session length
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.engagementScore}/10</div>
            <p className="text-xs text-muted-foreground">
              Average score
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SessionAnalyticsDashboard;
