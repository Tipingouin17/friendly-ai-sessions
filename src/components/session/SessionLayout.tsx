
import React from 'react';

interface SessionLayoutProps {
  children: React.ReactNode;
}

const SessionLayout = ({ children }: SessionLayoutProps) => {
  return (
    <div className="h-screen bg-gradient-to-b from-[#FFC107]/5 to-white flex flex-col">
      <div className="container mx-auto h-full max-w-4xl flex flex-col pt-4 sm:pt-16">
        <div className="flex-1 bg-white rounded-t-lg sm:rounded-t-3xl shadow-lg flex flex-col relative">
          {children}
        </div>
      </div>
    </div>
  );
};

export default SessionLayout;
