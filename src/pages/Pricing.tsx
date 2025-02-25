
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Plan } from "./pricing/types";
import { EnterprisePlanCard } from "./pricing/components/EnterprisePlanCard";
import { StandardPlanCard } from "./pricing/components/StandardPlanCard";
import { ComparisonTable } from "./pricing/components/ComparisonTable";
import { LoadingState } from "./pricing/components/LoadingState";
import { ErrorState } from "./pricing/components/ErrorState";

const Pricing = () => {
  const navigate = useNavigate();
  const { data: plans = [], isLoading, error } = useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .order('price', { ascending: true });
      
      if (error) throw error;
      return data;
    }
  });

  const handleContactUs = () => {
    navigate('/contact');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-4xl font-bold text-center mb-8">Simple, Transparent Pricing</h1>
          <p className="text-lg text-muted-foreground text-center mb-12">
            Choose the perfect plan for your needs
          </p>
          <LoadingState />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4">
          <ErrorState error={error as Error} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-4xl font-bold text-center mb-8">Simple, Transparent Pricing</h1>
        <p className="text-lg text-muted-foreground text-center mb-12">
          Choose the perfect plan for your needs
        </p>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {plans.map((plan) => (
            plan.title === "Enterprise" ? (
              <EnterprisePlanCard key={plan.id} onContactClick={handleContactUs} />
            ) : (
              <StandardPlanCard key={plan.id} plan={plan} />
            )
          ))}
        </div>

        <ComparisonTable plans={plans} />
      </div>
    </div>
  );
};

export default Pricing;
