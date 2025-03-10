
import { Navigation } from "./Navigation";
import { Footer } from "./Footer";
import { useLocation } from "react-router-dom";

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const hideFooterPaths = ['/my-facilitators', '/session'];
  
  // Check if we're on the admin page or session page to add proper spacing
  const sessionPages = ['/session-admin', '/session'];
  const isSessionPage = sessionPages.some(path => location.pathname.includes(path));

  return (
    <div className="min-h-screen flex flex-col text-left">
      <Navigation />
      <main className={`flex-grow ${isSessionPage ? 'pt-0' : 'pt-16'}`}>
        {children}
      </main>
      {!hideFooterPaths.includes(location.pathname) && <Footer />}
    </div>
  );
};
