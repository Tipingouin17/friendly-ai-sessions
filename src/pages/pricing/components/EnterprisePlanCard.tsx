
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EnterprisePlanCardProps {
  onContactClick: () => void;
}

export const EnterprisePlanCard = ({ onContactClick }: EnterprisePlanCardProps) => (
  <div className="glass-card p-8 rounded-2xl hover-lift">
    <h3 className="text-2xl font-bold mb-3">Enterprise</h3>
    <p className="text-muted-foreground mb-6">For large organizations with custom needs</p>
    <div className="space-y-4 mb-8">
      <p className="text-lg">
        Need unlimited capacity and advanced features? Our Enterprise plan offers a customized
        solution tailored to your organization's specific requirements.
      </p>
      <ul className="space-y-3">
        <li className="flex items-center gap-2">
          <Check className="h-5 w-5 text-primary" />
          <span>Unlimited facilitators</span>
        </li>
        <li className="flex items-center gap-2">
          <Check className="h-5 w-5 text-primary" />
          <span>Unlimited sessions</span>
        </li>
        <li className="flex items-center gap-2">
          <Check className="h-5 w-5 text-primary" />
          <span>Custom integrations</span>
        </li>
        <li className="flex items-center gap-2">
          <Check className="h-5 w-5 text-primary" />
          <span>Dedicated support</span>
        </li>
      </ul>
    </div>
    <Button 
      className="w-full"
      variant="outline"
      onClick={onContactClick}
    >
      Contact Sales Team
    </Button>
  </div>
);
