
import { LucideIcon } from "lucide-react";

interface FeatureCardProps {
  title: string;
  description: string;
  Icon: LucideIcon;
}

export const FeatureCard = ({ title, description, Icon }: FeatureCardProps) => {
  return (
    <div className="glass-card p-6 rounded-2xl hover-lift">
      <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
};
