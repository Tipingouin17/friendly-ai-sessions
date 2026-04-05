/**
 * Session Layout
 *
 * Session component for the AIfacilitator application.
 */

import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useLocation } from 'react-router-dom';

interface SessionLayoutProps {
  children: React.ReactNode;
}

const SessionLayout = ({ children }: SessionLayoutProps) => {
  const isMobile = useIsMobile();
  const location = useLocation();
  const isAdminPage = location.pathname.includes('admin');
  
  return (
    <div className="h-[100dvh] bg-white flex flex-col">
      <div className={`container mx-auto flex-1 max-w-7xl flex flex-col ${isMobile ? 'p-0' : isAdminPage ? 'px-4 py-16' : 'px-4 pt-16 pb-0'}`}>
        <div className={`flex-1 bg-white ${isMobile ? 'rounded-none' : 'rounded-lg'} shadow-sm flex flex-col relative overflow-hidden`}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default SessionLayout;
