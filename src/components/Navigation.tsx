
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export const Navigation = () => {
  const location = useLocation();
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md z-50 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link to="/" className="text-xl font-bold text-primary">AI Facilitator</Link>
          </div>
          <div className="hidden md:flex items-center space-x-8">
            {isAuthenticated && (
              <Link 
                to="/my-facilitators" 
                className={`${location.pathname === '/my-facilitators' ? 'text-primary font-medium' : 'text-gray-600'} hover:text-primary`}
              >
                My Facilitators
              </Link>
            )}
            <Link 
              to="/" 
              className={`${location.pathname === '/' ? 'text-primary font-medium' : 'text-gray-600'} hover:text-primary`}
            >
              Home
            </Link>
            <Link 
              to="/pricing" 
              className={`${location.pathname === '/pricing' ? 'text-primary font-medium' : 'text-gray-600'} hover:text-primary`}
            >
              Pricing
            </Link>
            <Link 
              to="/faqs" 
              className={`${location.pathname === '/faqs' ? 'text-primary font-medium' : 'text-gray-600'} hover:text-primary`}
            >
              FAQs
            </Link>
            <Link 
              to="/contact" 
              className={`${location.pathname === '/contact' ? 'text-primary font-medium' : 'text-gray-600'} hover:text-primary`}
            >
              Contact Us
            </Link>
            {isAuthenticated ? (
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">Hi, {user?.name}</span>
                <Button variant="outline" onClick={logout}>
                  Log out
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Link to="/login">
                  <Button variant="outline">Log in</Button>
                </Link>
                <Link to="/signup">
                  <Button>Sign up</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
