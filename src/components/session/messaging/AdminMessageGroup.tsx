
import React from 'react';
import { Message } from '@/types/chat';
import ParticipantResponseStats from '../ParticipantResponseStats';

interface AdminMessageGroupProps {
  group: {
    question: Message;
    responses: Message[];
  };
  groupIndex: number;
  participantColors: { [key: string]: string };
}

const AdminMessageGroup: React.FC<AdminMessageGroupProps> = ({
  group,
  groupIndex,
  participantColors
}) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 p-4 border-b border-gray-200">
        <div className="text-lg font-medium text-gray-800 mb-2">Question {groupIndex + 1}</div>
        <div className="text-gray-700 bg-white p-3 rounded-lg border border-gray-100">{group.question.content}</div>
      </div>
      
      <ParticipantResponseStats 
        responses={group.responses}
        totalParticipants={group.responses.length > 0 ? group.responses.length : 0}
        showDetailedStats={true}
      />
      
      <div className="divide-y divide-gray-100">
        {group.responses.map((response, responseIndex) => (
          <div key={`response-${response.id}-${responseIndex}`} className="p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: participantColors[response.participant] || '#888' }} 
              />
              <div className="text-sm font-medium text-gray-700 flex items-center gap-1">
                {response.isAnonymous ? 'Anonymous participant' : response.participant}
                {response.isAnonymous && 
                  <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">anonymous</span>
                }
              </div>
              <div className="text-xs text-gray-500 ml-auto">
                {response.timestamp ? new Date(response.timestamp).toLocaleTimeString() : ''}
              </div>
            </div>
            <div className="text-gray-700 pl-4 border-l-2 border-gray-100">{response.content}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminMessageGroup;
