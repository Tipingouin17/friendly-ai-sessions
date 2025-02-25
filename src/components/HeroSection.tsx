
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const HeroSection = () => {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-4xl mx-auto text-center animate-fade-up">
        <h1 className="text-5xl md:text-6xl font-bold mb-6 tracking-tight">
          Transform Your Journey with
          <span className="text-primary"> AI Facilitation</span>
        </h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Experience personalized growth through innovative AI-guided sessions that adapt to your unique path.
        </p>
        <Button size="lg" className="hover-lift">
          Start Your Session <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
