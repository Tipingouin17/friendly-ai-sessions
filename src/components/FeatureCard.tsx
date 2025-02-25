
import { LucideIcon } from "lucide-react";

interface FeatureCardProps {
  title: string;
  description: string;
  Icon: LucideIcon;
}

export const FeatureCard = ({ title, description, Icon }: FeatureCardProps) => {
  return (
    <div className="glass-card p-8 rounded-2xl hover-lift text-center">
      <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center mb-6 mx-auto shadow-lg">
        <Icon className="h-8 w-8 text-primary" />
      </div>
      <h3 className="text-lg font-semibold mb-3">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
};
