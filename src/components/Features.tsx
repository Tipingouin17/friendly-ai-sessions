
import { Brain, Users, Sparkles } from "lucide-react";
import { FeatureCard } from "./FeatureCard";

export const Features = () => {
  const features = [
    {
      title: "Intelligent Guidance",
      description: "Advanced AI algorithms provide personalized support tailored to your needs.",
      Icon: Brain,
    },
    {
      title: "Interactive Sessions",
      description: "Engage in dynamic conversations that adapt to your responses in real-time.",
      Icon: Users,
    },
    {
      title: "Continuous Growth",
      description: "Track your progress and receive insights to enhance your development.",
      Icon: Sparkles,
    },
  ];

  return (
    <div className="py-24 px-4 bg-accent/30">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
          Experience the Future of Personal Development
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>
      </div>
    </div>
  );
};
