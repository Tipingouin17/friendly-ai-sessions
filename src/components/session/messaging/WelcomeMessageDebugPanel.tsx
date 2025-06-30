
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, MessageSquare, User, Target } from 'lucide-react';

interface WelcomeMessageDebugPanelProps {
  conversation?: any;
  welcomeMessage?: string | null;
  isAdmin: boolean;
  onRegenerateWelcome?: () => void;
  isGenerating?: boolean;
}

const WelcomeMessageDebugPanel: React.FC<WelcomeMessageDebugPanelProps> = ({
  conversation,
  welcomeMessage,
  isAdmin,
  onRegenerateWelcome,
  isGenerating = false
}) => {
  if (!isAdmin) return null;

  const facilitator = conversation?.sessions?.facilitator_details || conversation?.facilitator;
  const sessionInfo = conversation?.sessions;

  return (
    <Card className="mb-4 border-blue-200 bg-blue-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-blue-900 flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Welcome Message Debug Panel (Admin Only)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Session Context */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Facilitator Context</span>
            </div>
            <div className="text-xs space-y-1">
              <div>Name: <Badge variant="outline">{facilitator?.title || 'Not set'}</Badge></div>
              <div>Details: <span className="text-gray-600">{facilitator?.details ? 'Available' : 'Missing'}</span></div>
              <div>Expertise: <Badge variant="outline">{facilitator?.expertise_level || 'Not set'}</Badge></div>
              <div>Specialties: <span className="text-gray-600">{facilitator?.specialties?.length || 0} items</span></div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Session Context</span>
            </div>
            <div className="text-xs space-y-1">
              <div>Title: <Badge variant="outline">{sessionInfo?.title || 'Not set'}</Badge></div>
              <div>Objective: <span className="text-gray-600">{sessionInfo?.objective ? 'Available' : 'Missing'}</span></div>
              <div>Type: <Badge variant="outline">{sessionInfo?.session_type || 'Not set'}</Badge></div>
              <div>Participants: <Badge variant="outline">{conversation?.participant_description || 'Not described'}</Badge></div>
            </div>
          </div>
        </div>

        {/* Welcome Message Status */}
        <div className="border-t pt-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-sm font-medium">Welcome Message Status</div>
              <div className="text-xs text-gray-600">
                Prop: {welcomeMessage ? 'Available' : 'Missing'} | 
                Session: {sessionInfo ? 'Available' : 'Missing'} | 
                Facilitator: {facilitator ? 'Available' : 'Missing'}
              </div>
            </div>
            {onRegenerateWelcome && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRegenerateWelcome}
                disabled={isGenerating}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-3 w-3 ${isGenerating ? 'animate-spin' : ''}`} />
                {isGenerating ? 'Generating...' : 'Regenerate'}
              </Button>
            )}
          </div>
        </div>

        {/* Context Completeness */}
        <div className="border-t pt-3">
          <div className="text-sm font-medium mb-2">Context Completeness</div>
          <div className="flex flex-wrap gap-1">
            <Badge variant={facilitator?.title ? 'default' : 'destructive'}>
              Facilitator Name
            </Badge>
            <Badge variant={facilitator?.details ? 'default' : 'destructive'}>
              Facilitator Details
            </Badge>
            <Badge variant={sessionInfo?.title ? 'default' : 'destructive'}>
              Session Title
            </Badge>
            <Badge variant={sessionInfo?.objective ? 'default' : 'destructive'}>
              Session Objective
            </Badge>
            <Badge variant={conversation?.participant_description ? 'default' : 'destructive'}>
              Participant Description
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WelcomeMessageDebugPanel;
