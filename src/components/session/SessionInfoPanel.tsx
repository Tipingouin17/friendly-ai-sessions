/**
 * Session Info Panel
 *
 * Session component for the AIfacilitator application.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Target, User, Clock, BarChart2, Globe, Tag } from 'lucide-react';
import { ParticipantInfo } from '@/types/chat';
import { useSessionTimer } from '@/hooks/useSessionTimer';
import SessionTimerBadge from './SessionTimerBadge';

interface SessionInfoPanelProps {
  conversationData: any;
  participants: ParticipantInfo[];
  currentParticipantCount: number;
  maxParticipants: number;
  className?: string;
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English', fr: 'French', de: 'German', es: 'Spanish',
  it: 'Italian', pt: 'Portuguese', nl: 'Dutch', pl: 'Polish',
  ru: 'Russian', zh: 'Chinese', ja: 'Japanese', ar: 'Arabic',
};

const SessionInfoPanel: React.FC<SessionInfoPanelProps> = ({
  conversationData,
  participants,
  currentParticipantCount,
  maxParticipants,
  className = ""
}) => {
  const facilitatorInfo = conversationData?.sessions?.facilitator_details;
  const session = conversationData?.sessions;
  const sessionTitle = session?.title || "Workshop Session";
  const sessionObjective = session?.objective || session?.welcome_message;
  const durationMinutes: number | null = conversationData?.session_duration_minutes ?? session?.duration_minutes ?? null;
  const timer = useSessionTimer(conversationData ?? null, false);
  const difficultyLevel: string | null = session?.difficulty_level ?? null;
  const sessionType: string | null = session?.session_type ?? null;
  const language: string | null = conversationData?.language ?? null;

  const languageLabel = language ? (LANGUAGE_NAMES[language.toLowerCase()] ?? language) : null;

  return (
    <div className={`w-80 bg-gray-50 border-l border-gray-200 flex flex-col ${className}`}>
      <div className="p-4 space-y-4 overflow-y-auto">

        {/* Session Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Target className="h-5 w-5 text-indigo-600" />
              Session Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <h3 className="font-medium text-gray-900 mb-1">{sessionTitle}</h3>
              {sessionObjective && (
                <p className="text-sm text-gray-600 leading-relaxed">
                  {sessionObjective}
                </p>
              )}
            </div>

            {/* Live countdown timer */}
            {timer && durationMinutes && (
              <div className="pt-1">
                <SessionTimerBadge timer={timer} showAddTime={false} />
              </div>
            )}

            {/* Session metadata chips */}
            {(durationMinutes || difficultyLevel || sessionType || languageLabel) && (
              <div className="flex flex-wrap gap-2 pt-1">
                {durationMinutes && (
                  <span className="inline-flex items-center gap-1 text-xs text-gray-600 bg-gray-100 rounded-full px-2.5 py-1">
                    <Clock className="h-3 w-3 text-indigo-500" />
                    {durationMinutes} min
                  </span>
                )}
                {difficultyLevel && (
                  <span className="inline-flex items-center gap-1 text-xs text-gray-600 bg-gray-100 rounded-full px-2.5 py-1 capitalize">
                    <BarChart2 className="h-3 w-3 text-violet-500" />
                    {difficultyLevel}
                  </span>
                )}
                {sessionType && (
                  <span className="inline-flex items-center gap-1 text-xs text-gray-600 bg-gray-100 rounded-full px-2.5 py-1 capitalize">
                    <Tag className="h-3 w-3 text-emerald-500" />
                    {sessionType}
                  </span>
                )}
                {languageLabel && (
                  <span className="inline-flex items-center gap-1 text-xs text-gray-600 bg-gray-100 rounded-full px-2.5 py-1">
                    <Globe className="h-3 w-3 text-sky-500" />
                    {languageLabel}
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Facilitator Info */}
        {facilitatorInfo && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <User className="h-5 w-5 text-blue-600" />
                Facilitator
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Avatar, name, and expertise level */}
              <div className="flex flex-col items-center text-center space-y-2">
                <Avatar className="h-16 w-16">
                  <AvatarImage
                    src={facilitatorInfo.profile_picture}
                    alt={facilitatorInfo.title}
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-blue-100 text-blue-700 text-lg">
                    {facilitatorInfo.title?.charAt(0) || 'F'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg">
                    {facilitatorInfo.title}
                  </h3>
                  {facilitatorInfo.expertise_level && (
                    <p className="text-xs text-indigo-600 font-medium capitalize mt-0.5">
                      {facilitatorInfo.expertise_level}
                    </p>
                  )}
                </div>
                {/* Specialties */}
                {facilitatorInfo.specialties && facilitatorInfo.specialties.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-1.5 mt-1">
                    {facilitatorInfo.specialties.map((s: string) => (
                      <Badge key={s} variant="secondary" className="text-xs">
                        {s}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* About */}
              {facilitatorInfo.details && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">About</h4>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {facilitatorInfo.details}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default SessionInfoPanel;
