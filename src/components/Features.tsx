
import { Brain, Globe, LineChart } from "lucide-react";
import { FeatureCard } from "./FeatureCard";
import { Button } from "./ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useUserPlan } from "@/hooks/useUserPlan";

export const Features = () => {
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

  const features = [{
    title: "Customizable & Advanced AI capabilities",
    description: "State-of-the-art AI facilitator designed to meet unique needs and preferences.",
    Icon: Brain
  }, {
    title: "Worldwide availability & Immediate Response",
    description: "Access your virtual facilitation partner 24/7, anywhere in the world.",
    Icon: Globe
  }, {
    title: "Cost Efficient & Up-to-Date",
    description: "Scalable solution powered by advanced algorithms and natural language processing.",
    Icon: LineChart
  }];

  return <>
      <div className="py-24 px-4 bg-primary/10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-center">Features and Benefits</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto text-center">
              AIfacilitator© is a state-of-the-art AI facilitator designed to meet the unique needs and preferences of every user.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {features.map(feature => <FeatureCard key={feature.title} {...feature} />)}
          </div>

          <div className="mt-16 text-center">
            <Button size="lg" variant="default" className="hover-lift" onClick={handleButtonClick}>
              {isAuthenticated ? "Go to My Facilitators" : "Try it for free now"}
            </Button>
            {showNoCreditCardText && (
              <p className="text-sm text-muted-foreground mt-4 text-center">*no credit card required</p>
            )}
          </div>
        </div>
      </div>

      <div className="py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-center">
            Experience the Future of Facilitation
          </h2>
          <p className="text-lg text-muted-foreground mb-12 text-center">
            At AIfacilitator, we believe that the future of facilitation lies in the power of AI.
            Our platform revolutionizes how sessions are conducted, empowering businesses and individuals to achieve greater outcomes.
          </p>
          <Button size="lg" variant="default" className="hover-lift" onClick={handleButtonClick}>
            {isAuthenticated ? "Go to My Facilitators" : "Try it for free now"}
          </Button>
          {showNoCreditCardText && (
            <p className="text-sm text-muted-foreground mt-4 text-center">*no credit card required</p>
          )}
        </div>
      </div>
    </>;
};
