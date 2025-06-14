
import React from 'react';
import { Message } from '@/types/chat';
import { MessageCircle, User, ChevronDown, ChevronUp, Clock, UserCog } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatDistanceToNow } from 'date-fns';

interface AdminMessageCardProps {
  message: Message;
  participantColor?: string;
  participantName?: string;
  isExpanded?: boolean;
  toggleExpand?: () => void;
  index: number;
}

const AdminMessageCard: React.FC<AdminMessageCardProps> = ({
  message,
  participantColor = '#444',
  participantName,
  isExpanded = false,
  toggleExpand = () => {},
  index
}) => {
  const isFacilitator = message.sender === 'assistant';
  const isAdmin = message.sender === 'admin';
  const isAnonymous = Boolean(message.isAnonymous);
  const messageTime = message.timestamp ? formatDistanceToNow(message.timestamp, { addSuffix: true }) : 'just now';
  
  // Format for admin messages
  if (isAdmin) {
    return (
      <Card className={`mb-3 border-l-4 shadow-sm animate-fade-in`} 
        style={{ borderLeftColor: '#3B82F6' }}>
        <CardContent className="p-0">
          <div className="p-3 bg-blue-50 rounded-tr-lg flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <UserCog className="w-4 h-4 text-blue-700" />
              </div>
              <div>
                <p className="font-medium text-blue-800">Admin</p>
                <p className="text-xs text-blue-700/70 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {messageTime}
                </p>
              </div>
            </div>
            
            <Collapsible defaultOpen={isExpanded}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" onClick={toggleExpand}
                  className="h-7 w-7 p-0 rounded-full text-blue-700">
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              
              <CollapsibleContent className="p-3">
                <p className="text-gray-800 whitespace-pre-wrap">{message.content}</p>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Format for facilitator messages
  if (isFacilitator) {
    return (
      <Card className={`mb-3 border-l-4 shadow-sm animate-fade-in`} 
        style={{ borderLeftColor: '#FFC107' }}>
        <CardContent className="p-0">
          <div className="p-3 bg-amber-50 rounded-tr-lg flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-amber-700" />
              </div>
              <div>
                <p className="font-medium text-amber-800">Facilitator</p>
                <p className="text-xs text-amber-700/70 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {messageTime}
                </p>
              </div>
            </div>
            
            <Collapsible defaultOpen={isExpanded}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" onClick={toggleExpand}
                  className="h-7 w-7 p-0 rounded-full text-amber-700">
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              
              <CollapsibleContent className="p-3">
                <p className="text-gray-800 whitespace-pre-wrap">{message.content}</p>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Format for user/participant messages - use participantName prop if provided
  const displayParticipantName = participantName || `Participant ${message.participant}`;
  
  return (
    <Card className={`mb-3 border-l-4 shadow-sm animate-fade-in`} 
      style={{ borderLeftColor: participantColor }}>
      <CardContent className="p-0">
        <div className="p-3 bg-white rounded-tr-lg flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" 
              style={{ backgroundColor: `${participantColor}20` }}>
              <User className="w-4 h-4" style={{ color: participantColor }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium text-gray-800">
                  {isAnonymous ? 'Anonymous participant' : displayParticipantName}
                </p>
                
                {isAnonymous && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className="text-xs py-0 px-2 bg-gray-50">
                          anonymous
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>This message was sent anonymously</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {messageTime}
              </p>
            </div>
          </div>
          
          <Collapsible defaultOpen={isExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" onClick={toggleExpand}
                className="h-7 w-7 p-0 rounded-full">
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="p-3">
              <p className="text-gray-800 whitespace-pre-wrap">{message.content}</p>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </CardContent>
    </div>
  );
};

export default AdminMessageCard;
