
import React from 'react';
import { ParticipantInfo } from "@/types/chat";
import { UserX } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ParticipantListItemProps {
  participant: ParticipantInfo;
  onRemove: (participantId: number) => void;
}

const ParticipantListItem: React.FC<ParticipantListItemProps> = ({
  participant,
  onRemove
}) => {
  return (
    <div 
      className="p-3 bg-white rounded-lg border border-gray-100 flex items-center gap-2 hover:border-gray-200 transition-colors group relative"
    >
      <div 
        className="w-2 h-2 rounded-full" 
        style={{ backgroundColor: ['#FCA5A5', '#FDBA74', '#BEF264'][participant.id % 3] }} 
      />
      <div className="flex-1">
        <div className="text-sm font-medium">{participant.name}</div>
        {participant.isAnonymous && (
          <div className="text-xs text-gray-500">Anonymous mode</div>
        )}
      </div>
      
      {/* Modified layout to prevent overlap */}
      <div className="flex items-center gap-2">
        <div className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full whitespace-nowrap">
          Active
        </div>
        
        {/* Remove participant button - visible on hover */}
        <Button
          variant="ghost"
          size="icon"
          className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 p-0"
          onClick={() => onRemove(participant.id)}
          title="Remove participant"
        >
          <UserX className="h-4 w-4 text-red-500" />
        </Button>
      </div>
    </div>
  );
};

export default ParticipantListItem;
