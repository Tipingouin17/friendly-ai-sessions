/**
 * Layout
 *
 * Component for the AIfacilitator application.
 */

import { Navigation } from "./Navigation";
import { Footer } from "./Footer";
import { useLocation } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import SessionMobileNav from "./session/SessionMobileNav";

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const hideFooterPaths = ['/my-facilitators', '/session'];
  
  // Check if we're on the admin page or session page to add proper spacing
  const isSessionPage = location.pathname.includes('/session');
  const isAdminPage = location.pathname.includes('admin');
  
  // Determine if we need the mobile session navigation
  const needsMobileSessionNav = isMobile && isSessionPage && !isAdminPage;
  
  // Don't render main navigation on admin pages at all
  const shouldShowMainNav = !isAdminPage;

  return (
    <div className="min-h-screen flex flex-col text-left">
      {/* Skip to main content — visible only on keyboard focus for screen readers */}
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>
      {shouldShowMainNav && (needsMobileSessionNav ? <SessionMobileNav /> : <Navigation />)}
      <main id="main-content" className={`flex-grow ${isSessionPage && !isAdminPage ? 'pt-0' : shouldShowMainNav ? 'pt-16' : 'pt-0'}`}>
        {children}
      </main>
      {!hideFooterPaths.includes(location.pathname) && !isAdminPage && <Footer />}
    </div>
  );
};
