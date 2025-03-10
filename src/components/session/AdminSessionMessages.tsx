
import React from 'react';
import { Message, ParticipantInfo } from "@/types/chat";
import ParticipantResponseStats from './ParticipantResponseStats';
import AdminMessageInput from './AdminMessageInput';

interface AdminSessionMessagesProps {
  messages: Message[];
  isLoading: boolean;
  participants: ParticipantInfo[];
  conversationData: any;
  onSendMessage: (message: string, isPinned: boolean, recipientId?: string) => void;
}

const AdminSessionMessages: React.FC<AdminSessionMessagesProps> = ({
  messages,
  isLoading,
  participants,
  conversationData,
  onSendMessage
}) => {
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h3 className="mb-2 text-xl font-medium">Loading session data...</h3>
          <p className="text-gray-500">
            Please wait while we fetch the session information.
          </p>
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h3 className="mb-2 text-xl font-medium">Waiting for session data...</h3>
          <p className="text-gray-500">
            No messages yet. The session may not have started.
          </p>
          <p className="text-gray-500 mt-2">
            Session: {conversationData?.sessions?.title || "Unknown"}
          </p>
          <p className="text-gray-500">
            Facilitator: {conversationData?.sessions?.facilitator_details?.title || "Unknown"}
          </p>
        </div>
      </div>
    );
  }

  // Group messages by facilitator question
  const groups = [];
  let currentGroup = { question: null, responses: [] };
  
  for (const message of messages) {
    if (message.sender === "assistant" && !message.isReport && !message.isAdminMessage) {
      if (currentGroup.question && currentGroup.responses.length > 0) {
        groups.push({ ...currentGroup });
      }
      currentGroup = { 
        question: message, 
        responses: [] 
      };
    } else if (message.sender === "user" && currentGroup.question) {
      currentGroup.responses.push(message);
    }
  }
  
  if (currentGroup.question && currentGroup.responses.length > 0) {
    groups.push(currentGroup);
  }

  return (
    <>
      <div className="flex-1 overflow-auto">
        <div className="p-6 space-y-8">
          {groups.map((group, groupIndex) => (
            <div key={`group-${groupIndex}-${group.question.id}`} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 p-4 border-b border-gray-200">
                <div className="text-lg font-medium text-gray-800 mb-2">Question {groupIndex + 1}</div>
                <div className="text-gray-700 bg-white p-3 rounded-lg border border-gray-100">{group.question.content}</div>
              </div>
              
              <ParticipantResponseStats 
                responses={group.responses}
                totalParticipants={conversationData?.participants || participants.length}
                showDetailedStats={true}
              />
              
              <div className="divide-y divide-gray-100">
                {group.responses.map((response, responseIndex) => {
                  const participant = participants.find(p => `P${p.id}` === response.participant);
                  return (
                    <div key={`response-${response.id}-${responseIndex}`} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: ['#FCA5A5', '#FDBA74', '#BEF264'][parseInt(response.participant?.substr(1) || '0') % 3] || '#888' }} 
                        />
                        <div className="text-sm font-medium text-gray-700 flex items-center gap-1">
                          {response.isAnonymous || participant?.isAnonymous ? 'Anonymous participant' : participant?.name || response.participant}
                          {(response.isAnonymous || participant?.isAnonymous) && 
                            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">anonymous</span>
                          }
                        </div>
                        <div className="text-xs text-gray-500 ml-auto">
                          {response.timestamp ? new Date(response.timestamp).toLocaleTimeString() : ''}
                        </div>
                      </div>
                      <div className="text-gray-700 pl-4 border-l-2 border-gray-100">{response.content}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <AdminMessageInput 
        onSendMessage={onSendMessage}
        participants={participants}
      />
    </>
  );
};

export default AdminSessionMessages;
