
import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";

const SessionMobileNav = () => {
  const { isAuthenticated } = useAuth();
  
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-white p-4 flex items-center justify-between border-b border-gray-100">
      <Link to="/" className="text-xl font-bold text-yellow-500">
        AI Facilitator
      </Link>
      
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="bg-yellow-50 rounded-full w-10 h-10 flex items-center justify-center">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent className="flex flex-col">
          <div className="flex flex-col space-y-6 mt-8">
            <Link to="/" className="text-gray-800 hover:text-yellow-500 font-medium text-lg">
              Home
            </Link>
            <Link to="/pricing" className="text-gray-600 hover:text-yellow-500 text-lg">
              Pricing
            </Link>
            <Link to="/faqs" className="text-gray-600 hover:text-yellow-500 text-lg">
              FAQs
            </Link>
            <Link to="/contact" className="text-gray-600 hover:text-yellow-500 text-lg">
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
                <Link to="/my-facilitators" className="w-full">
                  <Button variant="outline" className="w-full text-center rounded-full">
                    My Facilitators
                  </Button>
                </Link>
                <Link to="/profile" className="w-full">
                  <Button variant="outline" className="w-full text-center rounded-full">
                    Profile
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default SessionMobileNav;
