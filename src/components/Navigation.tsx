
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { UserCircle, Settings, BookOpen, ChevronDown, Menu } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";

export const Navigation = () => {
  const location = useLocation();
  const { isAuthenticated, user, logout } = useAuth();
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Check if current path is related to facilitators
  const isFacilitatorSection = ['/my-facilitators', '/session'].includes(location.pathname);
  
  // Check if we're on a session page or admin page
  const isSessionPage = location.pathname.includes('session-admin') || location.pathname.includes('session');
  const isAdminPage = location.pathname.includes('admin');
  
  // Different styling for admin pages
  const adminPageClass = isAdminPage ? 'bg-transparent border-transparent z-30' : 'bg-white/80 backdrop-blur-md border-gray-100';

  // If we're on a mobile session page, don't render the main navigation
  if (isMobile && isSessionPage) {
    return null;
  }

  return (
    <nav className={`fixed top-0 left-0 right-0 ${adminPageClass} z-50 border-b ${isSessionPage && !isAdminPage ? 'hidden md:flex' : ''}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link to="/" className="text-xl font-bold text-primary">
              AI Facilitator
            </Link>
          </div>
          
          {isMobile ? (
            <div className="flex items-center">
              <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                <Menu className="h-6 w-6" />
              </Button>
              
              {mobileMenuOpen && (
                <div className="absolute top-16 left-0 right-0 bg-white shadow-lg z-50 border-b border-gray-200">
                  <div className="flex flex-col p-4 space-y-4">
                    {isAuthenticated && (
                      <Link 
                        to="/my-facilitators" 
                        className={`${isFacilitatorSection ? 'text-primary font-medium' : 'text-gray-600'} hover:text-primary`}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        My Facilitators
                      </Link>
                    )}
                    <Link 
                      to="/" 
                      className={`${location.pathname === '/' ? 'text-primary font-medium' : 'text-gray-600'} hover:text-primary`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Home
                    </Link>
                    <Link 
                      to="/pricing" 
                      className={`${location.pathname === '/pricing' ? 'text-primary font-medium' : 'text-gray-600'} hover:text-primary`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Pricing
                    </Link>
                    <Link 
                      to="/faqs" 
                      className={`${location.pathname === '/faqs' ? 'text-primary font-medium' : 'text-gray-600'} hover:text-primary`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      FAQs
                    </Link>
                    <Link 
                      to="/contact" 
                      className={`${location.pathname === '/contact' ? 'text-primary font-medium' : 'text-gray-600'} hover:text-primary`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Contact Us
                    </Link>
                    {isAuthenticated ? (
                      <>
                        <div className="pt-2 border-t border-gray-100">
                          <div className="text-sm text-gray-600 mb-2">Hi, {user?.name}</div>
                          <div className="flex flex-col space-y-2">
                            <Link to="/profile" className="text-gray-600 hover:text-primary" onClick={() => setMobileMenuOpen(false)}>
                              Profile
                            </Link>
                            <Link to="/settings" className="text-gray-600 hover:text-primary" onClick={() => setMobileMenuOpen(false)}>
                              Settings
                            </Link>
                            <Link to="/past-workshops" className="text-gray-600 hover:text-primary" onClick={() => setMobileMenuOpen(false)}>
                              Past Workshops
                            </Link>
                            <Button variant="ghost" className="justify-start px-0" onClick={() => { logout(); setMobileMenuOpen(false); }}>
                              Log out
                            </Button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col space-y-2 pt-2 border-t border-gray-100">
                        <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                          <Button variant="outline" className="w-full">Log in</Button>
                        </Link>
                        <Link to="/signup" onClick={() => setMobileMenuOpen(false)}>
                          <Button className="w-full">Sign up</Button>
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
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
          )}
        </div>
      </div>
    </nav>
  );
};
