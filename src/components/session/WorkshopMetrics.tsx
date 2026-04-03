/**
 * Workshop Metrics
 *
 * Session component for the AIfacilitator application.
 */

import React from 'react';
import { Users, MessageSquare, Clock, TrendingUp } from 'lucide-react';

interface WorkshopMetricsProps {
  participantCount: number;
  messageCount: number;
  duration: number;
  engagementScore: number;
}

const WorkshopMetrics: React.FC<WorkshopMetricsProps> = ({
  participantCount,
  messageCount,
  duration,
  engagementScore
}) => {
  const getEngagementColor = (score: number) => {
    if (score >= 4) return 'text-green-600';
    if (score >= 2.5) return 'text-indigo-600';
    return 'text-red-600';
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Users className="w-4 h-4" />
        <span>{participantCount}</span>
      </div>
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <MessageSquare className="w-4 h-4" />
        <span>{messageCount}</span>
      </div>
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Clock className="w-4 h-4" />
        <span>{formatDuration(duration)}</span>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <TrendingUp className="w-4 h-4" />
        <span className={getEngagementColor(engagementScore)}>
          {engagementScore.toFixed(1)}
        </span>
      </div>
    </div>
  );
};

export default WorkshopMetrics;
