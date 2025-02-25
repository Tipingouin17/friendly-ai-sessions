
import { Navigation } from "./Navigation";
import { Footer } from "./Footer";
import { useLocation } from "react-router-dom";

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const hideFooterPaths = ['/my-facilitators', '/session'];

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-grow">
        {children}
      </main>
      {!hideFooterPaths.includes(location.pathname) && <Footer />}
    </div>
  );
};
