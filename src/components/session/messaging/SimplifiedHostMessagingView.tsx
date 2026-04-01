import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Message, ParticipantInfo } from '@/types/chat';
import PreSessionHostView from '@/components/session/host/PreSessionHostView';
import { MessageSquare, Users, Play, Clock, Wand2, SendHorizonal, ChevronDown, ChevronUp } from 'lucide-react';

interface SimplifiedHostMessagingViewProps {
  messages: Message[];
  participantColors: { [key: string]: string };
  currentParticipantCount: number;
  conversationData: any;
  isWaitingForResponses?: boolean;
  responseCount?: number;
  totalParticipants?: number;
  onTriggerFacilitatorResponse?: (hostInstruction?: string) => void;
  isSessionStarted?: boolean;
  onSessionStarted?: () => void;
  participants?: ParticipantInfo[];
  conversationId?: number | null;
  isAutoStarting?: boolean;
  autoStartCountdown?: number;
  onCancelAutoStart?: () => void;
  isSessionEnded?: boolean;
  isSessionPaused?: boolean;
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
  onCancelAutoStart,
  isSessionEnded = false,
  isSessionPaused = false,
}) => {
  const sessionStatus = isSessionEnded ? 'Ended' : isSessionPaused ? 'Paused' : 'Active';
  const statusColor = isSessionEnded ? 'text-red-600' : isSessionPaused ? 'text-yellow-600' : 'text-orange-600';
  const [activeTab, setActiveTab] = useState<'overview' | 'messages'>('overview');
  const [hostInstruction, setHostInstruction] = useState('');
  const [isInstructionExpanded, setIsInstructionExpanded] = useState(false);
  const [isSending, setIsSending] = useState(false);

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

  // Handle sending instruction with the next AI response
  const handleSendWithInstruction = async () => {
    if (!onTriggerFacilitatorResponse) return;
    setIsSending(true);
    try {
      const instruction = hostInstruction.trim() || undefined;
      await onTriggerFacilitatorResponse(instruction);
      setHostInstruction('');
      setIsInstructionExpanded(false);
    } finally {
      setIsSending(false);
    }
  };

  // Handle continue without instruction (normal flow)
  const handleContinueNormal = async () => {
    if (!onTriggerFacilitatorResponse) return;
    setIsSending(true);
    try {
      await onTriggerFacilitatorResponse();
    } finally {
      setIsSending(false);
    }
  };

  // Quick instruction presets
  const quickInstructions = [
    { label: 'Wrap up', instruction: 'Please wrap up the session. Summarize the key takeaways and provide closing remarks instead of asking another question.' },
    { label: 'Go deeper', instruction: 'Go deeper on the current topic. Ask a more specific, probing follow-up question.' },
    { label: 'Change topic', instruction: 'Transition to a new aspect of the workshop topic that has not been discussed yet.' },
    { label: 'Be practical', instruction: 'Focus on practical, actionable examples. Ask participants to share concrete implementation ideas.' },
  ];

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
          
          <Badge
            variant="default"
            className={
              isSessionEnded
                ? 'bg-red-100 text-red-800'
                : isSessionPaused
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-green-100 text-green-800'
            }
          >
            Session {sessionStatus}
          </Badge>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'overview' ? (
          <div className="p-6 space-y-6 overflow-y-auto h-full">
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
                    <div className="text-sm text-gray-600">AI Messages</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{participantMessages.length}</div>
                    <div className="text-sm text-gray-600">Responses</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${statusColor}`}>{sessionStatus}</div>
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
                  <div className="space-y-4">
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
                      <div className="flex items-center gap-2">
                        <Button 
                          onClick={handleContinueNormal}
                          variant="outline"
                          size="sm"
                          disabled={isSending}
                        >
                          Continue
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Host Instruction Panel - Always visible during active session */}
            <Card className="border-indigo-200 bg-indigo-50/50">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-indigo-800">
                    <Wand2 className="h-5 w-5" />
                    Instruct AI Facilitator
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsInstructionExpanded(!isInstructionExpanded)}
                    className="text-indigo-700 hover:text-indigo-900"
                  >
                    {isInstructionExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-indigo-600 mt-1">
                  Guide the AI's next response. Participants will not see your instruction.
                </p>
              </CardHeader>
              
              {isInstructionExpanded && (
                <CardContent className="pt-2">
                  {/* Quick instruction buttons */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {quickInstructions.map((qi) => (
                      <Button
                        key={qi.label}
                        variant="outline"
                        size="sm"
                        className="text-xs border-indigo-300 text-indigo-700 hover:bg-indigo-100"
                        onClick={() => setHostInstruction(qi.instruction)}
                      >
                        {qi.label}
                      </Button>
                    ))}
                  </div>

                  <Textarea
                    value={hostInstruction}
                    onChange={(e) => setHostInstruction(e.target.value)}
                    placeholder="Type your instruction for the AI facilitator... (e.g., 'Wrap up the session', 'Ask about implementation challenges', 'Focus on team collaboration')"
                    className="min-h-[80px] resize-none bg-white border-indigo-200 focus:border-indigo-400"
                  />
                  
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-3">
                    <span className="text-xs text-indigo-600">
                      {hostInstruction.trim() 
                        ? 'Click "Send with Instruction" to generate AI response with your guidance'
                        : 'Or click "Continue" above to let the AI respond naturally'}
                    </span>
                    <Button
                      onClick={handleSendWithInstruction}
                      size="sm"
                      disabled={!hostInstruction.trim() || isSending}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white w-full sm:w-auto"
                    >
                      {isSending ? (
                        <span className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
                          Generating...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <SendHorizonal className="h-4 w-4" />
                          Send with Instruction
                        </span>
                      )}
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>

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
