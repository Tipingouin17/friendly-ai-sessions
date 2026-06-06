/**
 * Layout
 *
 * Component for the AIfacilitator application.
 */

import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { Navigation } from "./Navigation";
import { useLocation } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import SessionMobileNav from "./session/SessionMobileNav";

const DeferredFooter = lazy(() => import("./Footer").then(module => ({ default: module.Footer })));

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const [footerReady, setFooterReady] = useState(false);
  const hideFooterPaths = ['/my-facilitators', '/session'];
  
  // Check if we're on the admin page or session page to add proper spacing
  const isSessionPage = location.pathname.includes('/session');
  const isAdminPage = location.pathname.includes('admin');
  
  // Determine if we need the mobile session navigation
  const needsMobileSessionNav = isMobile && isSessionPage && !isAdminPage;
  
  // Don't render main navigation on admin pages at all
  const shouldShowMainNav = !isAdminPage;

  useEffect(() => {
    setFooterReady(false);
    const showFooter = () => window.setTimeout(() => setFooterReady(true), location.pathname === '/' ? 1200 : 0);

    if (document.readyState === 'complete') {
      const timeoutId = showFooter();
      return () => window.clearTimeout(timeoutId);
    }

    window.addEventListener('load', showFooter, { once: true });
    return () => window.removeEventListener('load', showFooter);
  }, [location.pathname]);

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
      {!hideFooterPaths.includes(location.pathname) && !isAdminPage && footerReady && (
        <Suspense fallback={null}>
          <DeferredFooter />
        </Suspense>
      )}
    </div>
  );
};
