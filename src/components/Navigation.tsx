
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { UserCircle, Settings, BookOpen, ChevronDown, Menu } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { getUserDisplayName } from "@/utils/userUtils";

export const Navigation = () => {
  const location = useLocation();
  const { isAuthenticated, user, logout } = useAuth();
  const isMobile = useIsMobile();

  // Check if we're on a session page or admin page
  const isSessionPage = location.pathname.includes('/session');
  const isAdminPage = location.pathname.includes('admin');

  // Different styling for admin pages
  const adminPageClass = isAdminPage ? 'bg-transparent border-transparent z-30' : 'bg-white/80 backdrop-blur-md border-gray-100';

  // If we're on a mobile session page, don't render the main navigation
  if (isMobile && isSessionPage) {
    return null;
  }

  const userDisplayName = getUserDisplayName(user);

  return (
    <nav className={`fixed top-0 left-0 right-0 ${adminPageClass} z-50 border-b ${isSessionPage ? 'hidden md:flex' : 'flex'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="text-xl font-bold text-yellow-500">
            MyFacilitator
          </Link>

          {isMobile ? (
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 p-0">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent className="flex flex-col">
                <div className="flex flex-col space-y-6 mt-8">
                  {isAuthenticated && (
                    <Link to="/my-facilitators" className="text-gray-800 hover:text-yellow-500 font-medium text-lg">
                      My Facilitators
                    </Link>
                  )}
                  <Link to="/" className={`${location.pathname === '/' ? 'text-yellow-500 font-medium' : 'text-gray-600'} hover:text-yellow-500 text-lg`}>
                    Home
                  </Link>
                  <Link to="/pricing" className={`${location.pathname === '/pricing' ? 'text-yellow-500 font-medium' : 'text-gray-600'} hover:text-yellow-500 text-lg`}>
                    Pricing
                  </Link>
                  <Link to="/faqs" className={`${location.pathname === '/faqs' ? 'text-yellow-500 font-medium' : 'text-gray-600'} hover:text-yellow-500 text-lg`}>
                    FAQs
                  </Link>
                  <Link to="/contact" className={`${location.pathname === '/contact' ? 'text-yellow-500 font-medium' : 'text-gray-600'} hover:text-yellow-500 text-lg`}>
                    Contact Us
                  </Link>
                </div>
                
                <div className="mt-auto mb-8">
                  {!isAuthenticated ? (
                    <div className="flex flex-col space-y-3">
                      <Link to="/login" className="w-full">
                        <Button variant="outline" className="w-full text-center rounded-full">
                          Log in
                        </Button>
                      </Link>
                      <Link to="/signup" className="w-full">
                        <Button className="w-full text-center bg-yellow-500 hover:bg-yellow-600 rounded-full">
                          Sign up
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="flex flex-col space-y-3">
                      <div className="text-sm text-gray-600 mb-2">Hi, {userDisplayName}</div>
                      <Link to="/profile" className="w-full">
                        <Button variant="outline" className="w-full text-center rounded-full flex items-center gap-2">
                          <UserCircle className="h-4 w-4" /> Profile
                        </Button>
                      </Link>
                      <Link to="/settings" className="w-full">
                        <Button variant="outline" className="w-full text-center rounded-full flex items-center gap-2">
                          <Settings className="h-4 w-4" /> Settings
                        </Button>
                      </Link>
                      <Link to="/past-workshops" className="w-full">
                        <Button variant="outline" className="w-full text-center rounded-full flex items-center gap-2">
                          <BookOpen className="h-4 w-4" /> Past Workshops
                        </Button>
                      </Link>
                      <Button 
                        variant="outline" 
                        className="w-full text-center rounded-full"
                        onClick={logout}
                      >
                        Log out
                      </Button>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          ) : (
            <div className="hidden md:flex items-center space-x-8">
              {isAuthenticated && (
                <Link to="/my-facilitators" className={`${location.pathname.includes('/my-facilitators') ? 'text-yellow-500 font-medium' : 'text-gray-600'} hover:text-yellow-500`}>
                  My Facilitators
                </Link>
              )}
              <Link to="/" className={`${location.pathname === '/' ? 'text-yellow-500 font-medium' : 'text-gray-600'} hover:text-yellow-500`}>
                Home
              </Link>
              <Link to="/pricing" className={`${location.pathname === '/pricing' ? 'text-yellow-500 font-medium' : 'text-gray-600'} hover:text-yellow-500`}>
                Pricing
              </Link>
              <Link to="/faqs" className={`${location.pathname === '/faqs' ? 'text-yellow-500 font-medium' : 'text-gray-600'} hover:text-yellow-500`}>
                FAQs
              </Link>
              <Link to="/contact" className={`${location.pathname === '/contact' ? 'text-yellow-500 font-medium' : 'text-gray-600'} hover:text-yellow-500`}>
                Contact Us
              </Link>
              
              {isAuthenticated ? (
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600">Hi, {userDisplayName}</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="gap-2 rounded-full">
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
                    <Button variant="outline" className="rounded-full">Log in</Button>
                  </Link>
                  <Link to="/signup">
                    <Button className="bg-yellow-500 hover:bg-yellow-600 rounded-full">Sign up</Button>
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
