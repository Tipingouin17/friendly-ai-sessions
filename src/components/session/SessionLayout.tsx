
import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

interface SessionLayoutProps {
  children: React.ReactNode;
}

const SessionLayout = ({ children }: SessionLayoutProps) => {
  const isMobile = useIsMobile();
  
  return (
    <div className="h-screen bg-gradient-to-b from-[#FFC107]/5 to-white flex flex-col">
      <div className={`container mx-auto h-full max-w-4xl flex flex-col ${isMobile ? 'pt-0' : 'pt-16'}`}>
        <div className={`flex-1 bg-white ${isMobile ? 'rounded-none' : 'rounded-t-3xl'} shadow-lg flex flex-col relative`}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default SessionLayout;
