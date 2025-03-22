
import { Navigation } from "./Navigation";
import { Footer } from "./Footer";
import { useLocation } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const hideFooterPaths = ['/my-facilitators', '/session'];
  
  // Check if we're on the admin page or session page to add proper spacing
  const sessionPages = ['/session-admin', '/session'];
  const isSessionPage = sessionPages.some(path => location.pathname.includes(path));
  const isAdminPage = location.pathname.includes('admin');
  
  // Don't show the main navigation on any session pages on mobile
  // And also don't show it on desktop for regular session pages
  const shouldHideMainNav = (isMobile && isSessionPage) || 
                           (location.pathname === '/session');

  return (
    <div className="min-h-screen flex flex-col text-left">
      {!shouldHideMainNav && <Navigation />}
      <main className={`flex-grow ${isSessionPage || isAdminPage ? 'pt-0' : 'pt-16'}`}>
        {children}
      </main>
      {!hideFooterPaths.includes(location.pathname) && !isAdminPage && <Footer />}
    </div>
  );
};
