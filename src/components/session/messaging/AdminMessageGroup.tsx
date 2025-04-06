
import React, { useState } from 'react';
import { MessageGroup } from '@/hooks/messages/useMessageGrouping';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
import AdminMessageCard from './AdminMessageCard';

interface AdminMessageGroupProps {
  group: MessageGroup;
  groupIndex: number;
  participantColors: { [key: string]: string };
  participantNameMap: { [key: string]: string };
}

const AdminMessageGroup: React.FC<AdminMessageGroupProps> = ({
  group,
  groupIndex,
  participantColors,
  participantNameMap
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const responseCount = group.responses.length;
  
  return (
    <div className="space-y-3">
      {/* Question Card */}
      <AdminMessageCard 
        message={group.question}
        index={0}
        isExpanded={isExpanded}
        toggleExpand={() => setIsExpanded(!isExpanded)}
      />
      
      {/* Responses Section */}
      <Collapsible open={isExpanded} className="ml-6 space-y-2">
        <div className="flex items-center gap-2 ml-3 mb-2">
          <Badge variant="outline" className="bg-blue-50 text-blue-700">
            {responseCount} {responseCount === 1 ? 'Response' : 'Responses'}
          </Badge>
        </div>
        
        <CollapsibleContent className="space-y-3">
          {group.responses.map((response, idx) => (
            <AdminMessageCard
              key={`response-${groupIndex}-${idx}-${response.id}`}
              message={response}
              participantColor={participantColors[response.participant] || '#6c757d'}
              participantName={participantNameMap[response.participant] || response.participant}
              index={idx + 1}
              isExpanded={true}
            />
          ))}
        </CollapsibleContent>
      </Collapsible>
      
      <div className="border-b border-gray-100 mt-6 mb-6"></div>
    </div>
  );
};

export default AdminMessageGroup;
