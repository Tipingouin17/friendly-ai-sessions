/**
 * Navigation
 *
 * Top navigation bar for the AIfacilitator application.
 * On mobile the nav is rendered as a slide-in Sheet (drawer).
 * Every link inside the mobile Sheet closes the drawer AND scrolls
 * the new page to the top, so the user always starts at the top of
 * the destination page regardless of their scroll position.
 */

import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { UserCircle, Settings, BookOpen, ChevronDown, Menu, Zap, Shield } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { getUserDisplayName } from "@/utils/userUtils";
import { useState, useCallback } from "react";

export const Navigation = () => {
  const location = useLocation();
  const { isAuthenticated, user, logout } = useAuth();
  const isMobile = useIsMobile();
  // Controls the mobile Sheet open/close state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isSessionPage = location.pathname.includes('/session');
  const isAdminPage = location.pathname.includes('admin');

  const adminPageClass = isAdminPage ? 'bg-transparent border-transparent z-30' : 'bg-white/90 backdrop-blur-md border-gray-100';
  const userDisplayName = getUserDisplayName(user);

  const navLinkClass = (path: string) =>
    `text-sm font-medium transition-colors ${
      location.pathname === path
        ? 'text-indigo-600'
        : 'text-gray-600 hover:text-indigo-600'
    }`;

  /**
   * Called by every mobile nav link/button.
   * Closes the Sheet and scrolls the page to the top so the user
   * always lands at the beginning of the destination page.
   */
  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  if (isMobile && isSessionPage) {
    return null;
  }

  /** Wraps a Link so it closes the menu and scrolls to top on click. */
  const MobileLink = ({
    to,
    className,
    children,
  }: {
    to: string;
    className?: string;
    children: React.ReactNode;
  }) => (
    <Link to={to} className={className} onClick={closeMobileMenu}>
      {children}
    </Link>
  );

  return (
    <nav className={`fixed top-0 left-0 right-0 ${adminPageClass} z-50 border-b ${isSessionPage ? 'hidden md:flex' : 'flex'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">AIfacilitator</span>
          </Link>

          {isMobile ? (
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 p-0" aria-label="Open menu">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent className="flex flex-col">
                <div className="flex flex-col space-y-6 mt-8">
                  {isAuthenticated && (
                    <MobileLink to="/my-facilitators" className="text-gray-800 hover:text-indigo-600 font-medium text-lg">
                      My Facilitators
                    </MobileLink>
                  )}
                  <MobileLink
                    to="/"
                    className={`${location.pathname === '/' ? 'text-indigo-600 font-medium' : 'text-gray-600'} hover:text-indigo-600 text-lg`}
                  >
                    Home
                  </MobileLink>
                  <MobileLink
                    to="/about"
                    className={`${location.pathname === '/about' ? 'text-indigo-600 font-medium' : 'text-gray-600'} hover:text-indigo-600 text-lg`}
                  >
                    About
                  </MobileLink>
                  <MobileLink
                    to="/pricing"
                    className={`${location.pathname === '/pricing' ? 'text-indigo-600 font-medium' : 'text-gray-600'} hover:text-indigo-600 text-lg`}
                  >
                    Pricing
                  </MobileLink>
                  <MobileLink
                    to="/faqs"
                    className={`${location.pathname === '/faqs' ? 'text-indigo-600 font-medium' : 'text-gray-600'} hover:text-indigo-600 text-lg`}
                  >
                    FAQs
                  </MobileLink>
                  <MobileLink
                    to="/blog"
                    className={`${location.pathname.startsWith('/blog') ? 'text-indigo-600 font-medium' : 'text-gray-600'} hover:text-indigo-600 text-lg`}
                  >
                    Blog
                  </MobileLink>
                  <MobileLink
                    to="/contact"
                    className={`${location.pathname === '/contact' ? 'text-indigo-600 font-medium' : 'text-gray-600'} hover:text-indigo-600 text-lg`}
                  >
                    Contact Us
                  </MobileLink>
                </div>

                <div className="mt-auto mb-8">
                  {!isAuthenticated ? (
                    <div className="flex flex-col space-y-3">
                      <MobileLink to="/login" className="w-full">
                        <Button variant="outline" className="w-full text-center rounded-xl">
                          Log in
                        </Button>
                      </MobileLink>
                      <MobileLink to="/signup" className="w-full">
                        <Button className="w-full text-center bg-indigo-600 hover:bg-indigo-700 rounded-xl">
                          Get Started Free
                        </Button>
                      </MobileLink>
                    </div>
                  ) : (
                    <div className="flex flex-col space-y-3">
                      <div className="text-sm text-gray-600 mb-2">Hi, {userDisplayName}</div>
                      <MobileLink to="/profile" className="w-full">
                        <Button variant="outline" className="w-full text-center rounded-xl flex items-center gap-2">
                          <UserCircle className="h-4 w-4" /> Profile
                        </Button>
                      </MobileLink>
                      <MobileLink to="/settings" className="w-full">
                        <Button variant="outline" className="w-full text-center rounded-xl flex items-center gap-2">
                          <Settings className="h-4 w-4" /> Settings
                        </Button>
                      </MobileLink>
                      <MobileLink to="/past-workshops" className="w-full">
                        <Button variant="outline" className="w-full text-center rounded-xl flex items-center gap-2">
                          <BookOpen className="h-4 w-4" /> Past Workshops
                        </Button>
                      </MobileLink>
                      {user?.role === 'admin' && (
                        <MobileLink to="/admin" className="w-full">
                          <Button variant="outline" className="w-full text-center rounded-xl flex items-center gap-2 text-purple-600 border-purple-200 hover:border-purple-400">
                            <Shield className="h-4 w-4" /> Admin Panel
                          </Button>
                        </MobileLink>
                      )}
                      <Button
                        variant="outline"
                        className="w-full text-center rounded-xl"
                        onClick={() => { closeMobileMenu(); logout(); }}
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
                <Link to="/my-facilitators" className={navLinkClass('/my-facilitators')}>
                  My Facilitators
                </Link>
              )}
              <Link to="/" className={navLinkClass('/')}>Home</Link>
              <Link to="/about" className={navLinkClass('/about')}>About</Link>
              <Link to="/pricing" className={navLinkClass('/pricing')}>Pricing</Link>
              <Link to="/faqs" className={navLinkClass('/faqs')}>FAQs</Link>
              <Link to="/blog" className={navLinkClass('/blog')}>Blog</Link>
              <Link to="/contact" className={navLinkClass('/contact')}>Contact</Link>

              {isAuthenticated ? (
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500">Hi, {userDisplayName}</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="gap-2 rounded-xl text-sm border-gray-200 hover:border-indigo-300 hover:text-indigo-600">
                        My Account <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 bg-white rounded-xl shadow-lg border-gray-100">
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
                      {user?.role === 'admin' && (
                        <>
                          <div className="border-t border-gray-100 my-1" />
                          <DropdownMenuItem asChild>
                            <Link to="/admin" className="flex items-center gap-2 text-purple-600 font-medium">
                              <Shield className="h-4 w-4" /> Admin Panel
                            </Link>
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuItem onClick={logout}>
                        Log out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Link to="/login">
                    <Button variant="ghost" className="rounded-xl text-sm text-gray-600 hover:text-indigo-600">Log in</Button>
                  </Link>
                  <Link to="/signup">
                    <Button className="bg-indigo-600 hover:bg-indigo-700 rounded-xl text-sm font-semibold px-5 shadow-sm shadow-indigo-500/20">
                      Get Started Free
                    </Button>
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
