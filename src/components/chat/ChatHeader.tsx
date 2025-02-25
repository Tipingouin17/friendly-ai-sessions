
import React from 'react';

const ChatHeader = () => {
  return (
    <div className="p-6 border-b border-gray-100">
      <div className="flex items-center gap-4">
        <img
          src="/lovable-uploads/fd3ef4cf-16d2-4ba3-8378-899a48eec819.png"
          alt="AI Facilitator"
          className="w-12 h-12 rounded-full"
        />
        <div>
          <h2 className="text-xl font-semibold">Serious Game Master</h2>
          <p className="text-sm text-muted-foreground">Mission Cohesion: Team Dynamics</p>
        </div>
      </div>
    </div>
  );
};

export default ChatHeader;
