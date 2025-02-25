
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const Pricing = () => {
  const plans = [
    {
      name: "Starter",
      price: "29",
      description: "Perfect for individuals and small teams",
      features: [
        "5 AI facilitation sessions/month",
        "Basic customization options",
        "Email support",
        "Session history",
        "Basic analytics"
      ]
    },
    {
      name: "Professional",
      price: "99",
      description: "Ideal for growing businesses",
      features: [
        "Unlimited AI facilitation sessions",
        "Advanced customization options",
        "Priority support",
        "Detailed analytics",
        "Team collaboration tools",
        "Custom session templates"
      ]
    },
    {
      name: "Enterprise",
      price: "299",
      description: "For large organizations",
      features: [
        "Everything in Professional",
        "Dedicated account manager",
        "Custom AI model training",
        "API access",
        "Advanced security features",
        "SLA guarantee"
      ]
    }
  ];

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-4xl font-bold text-center mb-8">Simple, Transparent Pricing</h1>
        <p className="text-lg text-muted-foreground text-center mb-12">
          Choose the perfect plan for your needs
        </p>

        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div key={plan.name} className="glass-card p-8 rounded-2xl hover-lift">
              <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
              <p className="text-muted-foreground mb-4">{plan.description}</p>
              <div className="mb-6">
                <span className="text-4xl font-bold">${plan.price}</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <ul className="space-y-4 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-primary" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button className="w-full" variant={plan.name === "Professional" ? "default" : "outline"}>
                Get Started
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Pricing;
