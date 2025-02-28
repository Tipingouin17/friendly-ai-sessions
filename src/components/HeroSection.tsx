import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
export const HeroSection = () => {
  return <div className="min-h-[90vh] flex items-center justify-center px-4 pt-16">
      <div className="max-w-4xl mx-auto text-center animate-fade-up">
        <h1 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight text-center lg:text-6xl">
          Revolutionize Facilitation with
          <span className="text-primary text-center"> AI Technology</span>
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
    </div>;
};