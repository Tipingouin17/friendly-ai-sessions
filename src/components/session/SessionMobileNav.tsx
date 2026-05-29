/**
 * Session Mobile Nav
 *
 * Session component for the AIfacilitator application.
 */

import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Sparkles } from "lucide-react";

const SessionMobileNav = () => {
  const { isAuthenticated, user, logout } = useAuth();
  
  return (
    <div className="fixed left-0 right-0 top-0 z-50 flex h-12 items-center justify-between border-b border-slate-100 bg-white px-3 py-2 shadow-sm sm:h-16 sm:p-4">
      <Link to="/" className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600">
          <Sparkles className="h-3.5 w-3.5 text-white" />
        </div>
        <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-base font-bold text-transparent sm:text-lg">
          AI Facilitator
        </span>
      </Link>
      
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="h-9 w-9 p-0 sm:h-10 sm:w-10" aria-label="Open navigation">
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent className="flex flex-col">
          <div className="flex flex-col space-y-6 mt-8">
            <Link to="/" className="text-slate-800 hover:text-indigo-600 font-medium text-lg transition-colors">
              Home
            </Link>
            <Link to="/pricing" className="text-slate-600 hover:text-indigo-600 text-lg transition-colors">
              Pricing
            </Link>
            <Link to="/faqs" className="text-slate-600 hover:text-indigo-600 text-lg transition-colors">
              FAQs
            </Link>
            <Link to="/contact" className="text-slate-600 hover:text-indigo-600 text-lg transition-colors">
              Contact Us
            </Link>
          </div>
          
          <div className="mt-auto mb-8">
            {!isAuthenticated ? (
              <div className="flex flex-col space-y-3">
                <Link to="/login" className="w-full">
                  <Button variant="outline" className="w-full text-center rounded-full border-indigo-200 text-indigo-700 hover:bg-indigo-50">
                    Log in
                  </Button>
                </Link>
                <Link to="/signup" className="w-full">
                  <Button className="w-full text-center bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 rounded-full text-white">
                    Sign up
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="flex flex-col space-y-3">
                <Link to="/my-facilitators" className="w-full">
                  <Button variant="outline" className="w-full text-center rounded-full">
                    My Workshops
                  </Button>
                </Link>
                <Link to="/profile" className="w-full">
                  <Button variant="outline" className="w-full text-center rounded-full">
                    Profile
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
    </div>
  );
};

export default SessionMobileNav;
