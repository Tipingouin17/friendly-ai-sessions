
import { Check, Users, Calendar, UserPlus, MessageSquare, Wand2, Save, BarChart3, Download, Headphones, Palette, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface EnterprisePlanCardProps {
  onContactClick: () => void;
}

export const EnterprisePlanCard = ({ onContactClick }: EnterprisePlanCardProps) => {
  const navigate = useNavigate();

  const enterpriseFeatures = [
    { icon: <Users className="h-4 w-4" />, text: "Unlimited facilitators" },
    { icon: <Calendar className="h-4 w-4" />, text: "Unlimited sessions per month" },
    { icon: <UserPlus className="h-4 w-4" />, text: "Unlimited participants per session" },
    { icon: <MessageSquare className="h-4 w-4" />, text: "Unlimited questions per session" },
    { icon: <Wand2 className="h-4 w-4" />, text: "Customizable sessions" },
    { icon: <Wand2 className="h-4 w-4" />, text: "Customizable facilitators" },
    { icon: <Save className="h-4 w-4" />, text: "Save sessions" },
    { icon: <BarChart3 className="h-4 w-4" />, text: "Detailed session reports" },
    { icon: <Download className="h-4 w-4" />, text: "Export session data" },
    { icon: <Headphones className="h-4 w-4" />, text: "Priority support" },
    { icon: <Palette className="h-4 w-4" />, text: "Custom branding" },
    { icon: <Building2 className="h-4 w-4" />, text: "Dedicated account manager" },
  ];

  return (
    <div className="glass-card p-8 rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 shadow-lg">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
        {/* Left: Plan info */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="h-8 w-8 text-primary" />
            <h3 className="text-2xl font-bold">Enterprise</h3>
          </div>
          <p className="text-muted-foreground mb-4">
            For large organizations with custom needs and unlimited scale.
          </p>
          <div className="text-3xl font-bold text-primary mb-1">Custom Pricing</div>
          <p className="text-sm text-muted-foreground">Tailored to your organization's requirements</p>
        </div>

        {/* Right: Features grid */}
        <div className="flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {enterpriseFeatures.map((feature, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <div className="text-primary flex-shrink-0">{feature.icon}</div>
                <span>{feature.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mt-8">
        <Button
          className="flex-1 bg-primary hover:bg-primary/90"
          onClick={onContactClick}
        >
          Contact Sales Team
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => navigate('/contact')}
        >
          Schedule a Demo
        </Button>
      </div>
    </div>
  );
};
