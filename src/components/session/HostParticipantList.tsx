
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, MessageSquare, Crown } from "lucide-react";
import { ParticipantInfo, Message } from "@/types/chat";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface HostParticipantListProps {
  participants: ParticipantInfo[];
  currentParticipantCount: number;
  maxParticipants: number;
  isLoading: boolean;
  conversationData: any;
  messages: Message[];
  onSendMessage?: (message: string, isPinned: boolean, recipientId?: string) => void;
}

const HostParticipantList: React.FC<HostParticipantListProps> = ({
  participants,
  currentParticipantCount,
  maxParticipants,
  isLoading,
  conversationData,
  messages,
  onSendMessage
}) => {
  const getParticipantMessageCount = (participantId: number) => {
    return messages.filter(m => 
      m.sender === 'user' && 
      m.participant === `P${participantId}`
    ).length;
  };

  const handleMessageParticipant = (participantId: number) => {
    if (onSendMessage) {
      const message = `Private message to participant ${participantId}`;
      onSendMessage(message, false, String(participantId));
    }
  };

  return (
    <Card className="w-80 bg-white border-l rounded-l-none rounded-r-lg m-4 ml-0">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5" />
          Participants
          <Badge variant="secondary" className="ml-auto">
            {currentParticipantCount}/{maxParticipants}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-200px)]">
          <div className="space-y-2 p-4 pt-0">
            {isLoading ? (
              <div className="text-center text-gray-500 py-8">
                Loading participants...
              </div>
            ) : participants.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                No participants yet
              </div>
            ) : (
              participants.map((participant) => (
                <div key={participant.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={participant.avatar || undefined} />
                    <AvatarFallback>
                      {participant.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {participant.name}
                      </p>
                      {participant.isHost && (
                        <Crown className="h-4 w-4 text-yellow-500" />
                      )}
                      {participant.isAnonymous && (
                        <Badge variant="outline" className="text-xs">
                          Anonymous
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 mt-1">
                      <MessageSquare className="h-3 w-3 text-gray-400" />
                      <span className="text-xs text-gray-500">
                        {getParticipantMessageCount(participant.id)} messages
                      </span>
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMessageParticipant(participant.id)}
                    className="text-xs"
                  >
                    Message
                  </Button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default HostParticipantList;
