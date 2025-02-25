
import React from 'react';

interface ChatHeaderProps {
  title?: string;
  objective?: string;
  profilePicture?: string;
}

const ChatHeader = ({ 
  title = "Serious Game Master", 
  objective = "Mission Cohesion: Team Dynamics",
  profilePicture = "/lovable-uploads/fd3ef4cf-16d2-4ba3-8378-899a48eec819.png"
}: ChatHeaderProps) => {
  return (
    <div className="p-6 border-b border-gray-100">
      <div className="flex items-center gap-4">
        <img
          src={profilePicture}
          alt="AI Facilitator"
          className="w-12 h-12 rounded-full"
        />
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{objective}</p>
        </div>
      </div>
    </div>
  );
};

export default ChatHeader;
