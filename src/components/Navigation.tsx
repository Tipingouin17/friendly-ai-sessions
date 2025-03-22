
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { UserCircle, Settings, BookOpen, ChevronDown } from "lucide-react";

export const Navigation = () => {
  const location = useLocation();
  const { isAuthenticated, user, logout } = useAuth();

  // Check if current path is related to facilitators
  const isFacilitatorSection = ['/my-facilitators', '/session'].includes(location.pathname);
  
  // Check if we're on a session page or admin page
  const isSessionPage = location.pathname.includes('session-admin') || location.pathname.includes('session');
  const isAdminPage = location.pathname.includes('admin');
  
  // Different styling for admin pages
  const adminPageClass = isAdminPage ? 'bg-transparent border-transparent z-30' : 'bg-white/80 backdrop-blur-md border-gray-100';

  return (
    <nav className={`fixed top-0 left-0 right-0 ${adminPageClass} z-50 border-b ${isSessionPage && !isAdminPage ? 'hidden md:flex' : ''}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link to="/" className="text-xl font-bold text-primary">
              AI Facilitator
            </Link>
          </div>
          <div className="hidden md:flex items-center space-x-8">
            {isAuthenticated && (
              <Link 
                to="/my-facilitators" 
                className={`${isFacilitatorSection ? 'text-primary font-medium' : 'text-gray-600'} hover:text-primary`}
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
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      My Account <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 bg-white">
                    <DropdownMenuItem asChild>
                      <Link to="/profile" className="flex items-center gap-2">
                        <UserCircle className="h-4 w-4" /> Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/settings" className="flex items-center gap-2">
                        <Settings className="h-4 w-4" /> Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/past-workshops" className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4" /> Past Workshops
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={logout}>
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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
