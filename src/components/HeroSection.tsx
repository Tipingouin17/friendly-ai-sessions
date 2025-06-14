
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useUserPlan } from "@/hooks/useUserPlan";

export const HeroSection = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { plan, isLoading: planLoading } = useUserPlan();

  const handleButtonClick = () => {
    if (isAuthenticated) {
      navigate("/my-facilitators");
    } else {
      navigate("/login");
    }
  };

  // Show "no credit card required" text when:
  // - User is not authenticated, OR
  // - User is authenticated but on a free plan, OR
  // - Plan data is still loading (to avoid layout shifts)
  const showNoCreditCardText = !isAuthenticated || planLoading || (plan && plan.title === 'Free');

  return <div className="min-h-[90vh] flex items-center justify-center px-4 pt-16">
      <div className="max-w-4xl mx-auto text-center animate-fade-up">
        <h1 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight text-center lg:text-6xl">
          Revolutionize Facilitation with
          <span className="text-primary text-center"> AI Technology</span>
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto text-center">
          Experience personalized AI facilitation that brings tailored and customizable guidance to businesses and individuals worldwide.
        </p>
        <div className="space-y-4 flex flex-col items-center">
          <Button size="lg" className="hover-lift" onClick={handleButtonClick}>
            {isAuthenticated ? "Go to My Facilitators" : "Try it for free now"} <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          {showNoCreditCardText && (
            <p className="text-sm text-muted-foreground">*no credit card required</p>
          )}
        </div>
      </div>
    </div>;
};
