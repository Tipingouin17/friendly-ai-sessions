
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export const HeroSection = () => {
  return (
    <>
      <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link to="/" className="text-xl font-bold text-primary">AI Facilitator</Link>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#" className="text-gray-600 hover:text-primary">My Facilitators</a>
              <Link to="/" className="text-gray-600 hover:text-primary">Home</Link>
              <Link to="/pricing" className="text-gray-600 hover:text-primary">Pricing</Link>
              <Link to="/faqs" className="text-gray-600 hover:text-primary">FAQs</Link>
              <Link to="/contact" className="text-gray-600 hover:text-primary">Contact Us</Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="min-h-[90vh] flex items-center justify-center px-4 pt-16">
        <div className="max-w-4xl mx-auto text-center animate-fade-up">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 tracking-tight">
            Revolutionize Facilitation with
            <span className="text-primary"> AI Technology</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Experience personalized AI facilitation that brings tailored and customizable guidance to businesses and individuals worldwide.
          </p>
          <div className="space-y-4">
            <Button size="lg" className="hover-lift">
              Try it for free now! <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <p className="text-sm text-muted-foreground">*no credit card required</p>
          </div>
        </div>
      </div>
    </>
  );
};
