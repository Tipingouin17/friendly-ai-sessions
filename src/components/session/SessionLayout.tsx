
import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

interface SessionLayoutProps {
  children: React.ReactNode;
}

const SessionLayout = ({ children }: SessionLayoutProps) => {
  const isMobile = useIsMobile();
  
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className={`container mx-auto h-full max-w-7xl flex flex-col ${isMobile ? 'p-0' : 'px-4 pt-6'}`}>
        <div className={`flex-1 bg-white ${isMobile ? 'rounded-none' : 'rounded-lg'} shadow-sm flex flex-col relative`}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default SessionLayout;
