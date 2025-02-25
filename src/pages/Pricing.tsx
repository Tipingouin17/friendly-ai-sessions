import { Check, X, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface Plan {
  id: number;
  title: string;
  price: number;
  plan_type: string;
  plan_details: string[];
  plan_table_details: Record<string, boolean | string | number>;
  is_popular: boolean;
  stripe_plan_id: string;
}

const FEATURE_LABELS: Record<string, string> = {
  no_of_facilitator: "Number of Facilitators",
  no_of_sessions: "Number of Sessions",
  max_participants: "Maximum Participants",
  customisable_sessions: "Customizable Sessions",
  saved_sessions: "Save Sessions",
  session_reports: "Session Reports",
  data_export: "Data Export"
};

const Pricing = () => {
  const navigate = useNavigate();
  const { data: plans = [], isLoading } = useQuery({
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

  if (isLoading) {
    return (
      <div className="min-h-screen pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center">Loading plans...</div>
        </div>
      </div>
    );
  }

  const handleContactUs = () => {
    navigate('/contact');
  };

  const allFeatures = [
    'no_of_facilitator',
    'no_of_sessions',
    'max_participants',
    'customisable_sessions',
    'saved_sessions',
    'session_reports',
    'data_export'
  ];

  const renderValue = (value: boolean | string | number | null) => {
    if (typeof value === 'boolean') {
      return value ? (
        <Check className="h-5 w-5 text-primary mx-auto" />
      ) : (
        <X className="h-5 w-5 text-gray-300 mx-auto" />
      );
    }
    if (value === null || value === undefined) {
      return <Minus className="h-5 w-5 text-gray-300 mx-auto" />;
    }
    return <span className="text-center">{value}</span>;
  };

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-4xl font-bold text-center mb-8">Simple, Transparent Pricing</h1>
        <p className="text-lg text-muted-foreground text-center mb-12">
          Choose the perfect plan for your needs
        </p>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {plans.map((plan) => (
            <div 
              key={plan.id} 
              className={`glass-card p-8 rounded-2xl hover-lift relative ${
                plan.is_popular ? 'ring-2 ring-primary' : ''
              }`}
            >
              {plan.is_popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </span>
                </div>
              )}
              
              <h3 className="text-2xl font-bold mb-2">{plan.title}</h3>
              <p className="text-muted-foreground mb-4">{plan.plan_type}</p>
              <div className="mb-6">
                {plan.title === "Enterprise" ? (
                  <span className="text-2xl font-bold">Custom Pricing</span>
                ) : (
                  <>
                    <span className="text-4xl font-bold">${plan.price}</span>
                    <span className="text-muted-foreground">/month</span>
                  </>
                )}
              </div>
              <ul className="space-y-4 mb-8">
                {(plan.plan_details as string[])?.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-primary" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button 
                className="w-full" 
                variant={plan.is_popular ? "default" : "outline"}
                onClick={plan.title === "Enterprise" ? handleContactUs : undefined}
              >
                {plan.title === "Enterprise" ? "Contact Us" : "Get Started"}
              </Button>
            </div>
          ))}
        </div>

        {/* Comparison Table */}
        <div className="mt-16">
          <h2 className="text-3xl font-bold text-center mb-8">Compare Plans</h2>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full border-collapse bg-white">
              <thead>
                <tr className="border-b">
                  <th className="py-4 px-6 text-left font-medium text-gray-500 bg-gray-50">Features</th>
                  {plans.map((plan) => (
                    <th 
                      key={plan.id} 
                      className={`py-4 px-6 text-center font-medium ${
                        plan.is_popular ? 'bg-primary/5' : 'bg-gray-50'
                      }`}
                    >
                      <span className="block text-lg font-semibold text-gray-900">{plan.title}</span>
                      <span className="block text-sm text-gray-500 mt-1">
                        {plan.title === "Enterprise" ? "Custom Pricing" : `$${plan.price}/month`}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {allFeatures.map((feature) => (
                  <tr key={feature} className="hover:bg-gray-50">
                    <td className="py-4 px-6 text-sm font-medium text-gray-900">
                      {FEATURE_LABELS[feature]}
                    </td>
                    {plans.map((plan) => (
                      <td 
                        key={`${plan.id}-${feature}`} 
                        className={`py-4 px-6 text-sm text-center ${
                          plan.is_popular ? 'bg-primary/5' : ''
                        }`}
                      >
                        {renderValue(plan.plan_table_details?.[feature])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
