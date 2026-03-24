import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Message, ParticipantInfo } from '@/types/chat';
import PreSessionHostView from '@/components/session/host/PreSessionHostView';
import { MessageSquare, Users, Play, Clock } from 'lucide-react';

interface SimplifiedHostMessagingViewProps {
  messages: Message[];
  participantColors: { [key: string]: string };
  currentParticipantCount: number;
  conversationData: any;
  isWaitingForResponses?: boolean;
  responseCount?: number;
  totalParticipants?: number;
  onTriggerFacilitatorResponse?: () => void;
  isSessionStarted?: boolean;
  onSessionStarted?: () => void;
  participants?: ParticipantInfo[];
  conversationId?: number | null;
  isAutoStarting?: boolean;
  autoStartCountdown?: number;
  onCancelAutoStart?: () => void;
}

const SimplifiedHostMessagingView: React.FC<SimplifiedHostMessagingViewProps> = ({
  messages,
  participantColors,
  currentParticipantCount,
  conversationData,
  isWaitingForResponses = false,
  responseCount = 0,
  totalParticipants = 0,
  onTriggerFacilitatorResponse,
  isSessionStarted = false,
  onSessionStarted,
  participants = [],
  conversationId,
  isAutoStarting = false,
  autoStartCountdown = 0,
  onCancelAutoStart
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'messages'>('overview');

  // Show pre-session view if session hasn't started
  if (!isSessionStarted) {
    return (
      <PreSessionHostView
        conversationData={conversationData}
        conversationId={conversationId}
        participantCount={currentParticipantCount}
        onSessionStarted={onSessionStarted || (() => { /* no-op */ })}
        isAutoStarting={isAutoStarting}
        autoStartCountdown={autoStartCountdown}
        onCancelAutoStart={onCancelAutoStart}
      />
    );
  }

  const facilitatorMessages = messages.filter(m => m.sender === 'assistant');
  const participantMessages = messages.filter(m => m.sender === 'user');

  return (
    <div className="flex flex-col h-full">
      {/* Header with tabs */}
      <div className="border-b bg-white p-4">
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant={activeTab === 'overview' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('overview')}
            className="flex items-center gap-2"
          >
            <Users className="h-4 w-4" />
            Overview
          </Button>
          <Button
            variant={activeTab === 'messages' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('messages')}
            className="flex items-center gap-2"
          >
            <MessageSquare className="h-4 w-4" />
            Messages
            <Badge variant="secondary">{messages.length}</Badge>
          </Button>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                {currentParticipantCount} participants
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                {participantMessages.length} responses
              </span>
            </div>
          </div>
          
          <Badge variant="default" className="bg-green-100 text-green-800">
            Session Active
          </Badge>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'overview' ? (
          <div className="p-6 space-y-6">
            {/* Session Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="h-5 w-5" />
                  Session Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{currentParticipantCount}</div>
                    <div className="text-sm text-gray-600">Participants</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{facilitatorMessages.length}</div>
                    <div className="text-sm text-gray-600">Questions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{participantMessages.length}</div>
                    <div className="text-sm text-gray-600">Responses</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">Active</div>
                    <div className="text-sm text-gray-600">Status</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Response Collection Status */}
            {isWaitingForResponses && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Collecting Responses
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">
                        {responseCount} of {totalParticipants} participants have responded
                      </p>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: totalParticipants > 0 
                              ? `${(responseCount / totalParticipants) * 100}%` 
                              : '0%' 
                          }}
                        />
                      </div>
                    </div>
                    
                    {onTriggerFacilitatorResponse && (
                      <Button 
                        onClick={onTriggerFacilitatorResponse}
                        variant="outline"
                        size="sm"
                      >
                        Continue
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Session Info */}
            <Card>
              <CardHeader>
                <CardTitle>Session Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <span className="font-medium">Title:</span>{' '}
                    {conversationData?.sessions?.title || 'Untitled Session'}
                  </div>
                  <div>
                    <span className="font-medium">Facilitator:</span>{' '}
                    {conversationData?.sessions?.facilitator_details?.title || 'Unknown'}
                  </div>
                  <div>
                    <span className="font-medium">Objective:</span>{' '}
                    {conversationData?.sessions?.objective || 'Not specified'}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <ScrollArea className="h-full p-4">
            <div className="space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 py-12">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium mb-2">No messages yet</h3>
                  <p>Messages will appear here once participants begin responding.</p>
                </div>
              ) : (
                messages.map((message, index) => (
                  <div key={message.id || index} className="border rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                        message.sender === 'assistant' ? 'bg-blue-500' : 'bg-gray-500'
                      }`}>
                        {message.sender === 'assistant' ? 'F' : 'P'}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">
                            {message.sender === 'assistant' 
                              ? (conversationData?.sessions?.facilitator_details?.title || 'Facilitator')
                              : (message.participant || 'Participant')
                            }
                          </span>
                          <span className="text-xs text-gray-500">
                            {message.timestamp?.toLocaleTimeString() || 'Now'}
                          </span>
                        </div>
                        
                        <p className="text-gray-700">{message.content}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
};

export default SimplifiedHostMessagingView;
