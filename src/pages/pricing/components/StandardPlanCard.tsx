import { Check, Users, Calendar, UserPlus, MessageSquare, Wand2, Save, BarChart3, Download, Headphones, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Plan } from "../types";
import { useNavigate } from "react-router-dom";

interface StandardPlanCardProps {
  plan: Plan;
  isCurrentPlan?: boolean;
  index?: number;
}

export const StandardPlanCard = ({
  plan,
  isCurrentPlan = false,
  index = 0
}: StandardPlanCardProps) => {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    if (isCurrentPlan) {
      navigate('/profile');
    } else {
      navigate(`/checkout?plan=${plan.id}`);
    }
  };

  const getCurrencySymbol = (currency: string) => {
    switch (currency.toUpperCase()) {
      case 'EUR':
        return '€';
      case 'GBP':
        return '£';
      case 'USD':
      default:
        return '$';
    }
  };

  const formatDisplayPrice = (price: number | string) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(numPrice) || numPrice === 0) return 'Free';
    return Number.isInteger(numPrice) ? numPrice.toString() : numPrice.toFixed(2);
  };

  const isPlanPopular = plan.is_popular;

  // Get icon for feature type
  const getFeatureIcon = (feature: string) => {
    if (feature.includes('facilitator')) return <Users className="h-4 w-4" />;
    if (feature.includes('session') && !feature.includes('question')) return <Calendar className="h-4 w-4" />;
    if (feature.includes('participant')) return <UserPlus className="h-4 w-4" />;
    if (feature.includes('question')) return <MessageSquare className="h-4 w-4" />;
    if (feature.toLowerCase().includes('custom')) return <Wand2 className="h-4 w-4" />;
    if (feature.includes('save')) return <Save className="h-4 w-4" />;
    if (feature.includes('report')) return <BarChart3 className="h-4 w-4" />;
    if (feature.includes('export')) return <Download className="h-4 w-4" />;
    if (feature.includes('support')) return <Headphones className="h-4 w-4" />;
    if (feature.includes('branding')) return <Palette className="h-4 w-4" />;
    return <Check className="h-4 w-4" />;
  };

  const getFeatureList = (): string[] => {
    const features: string[] = [];
    const restrictions = plan.plan_table_details;

    if (!restrictions) return features;

    // Facilitator limit
    if (restrictions.facilitator_limit) {
      const isUnlimited = restrictions.facilitator_limit >= 999999;
      features.push(isUnlimited
        ? 'Unlimited facilitators'
        : `${restrictions.facilitator_limit} ${restrictions.facilitator_limit === 1 ? 'facilitator' : 'facilitators'}`
      );
    }

    // Session limit
    if (restrictions.session_limit) {
      const isUnlimited = restrictions.session_limit >= 999999;
      features.push(isUnlimited
        ? 'Unlimited sessions per month'
        : `${restrictions.session_limit} ${restrictions.session_limit === 1 ? 'session' : 'sessions'} per month`
      );
    }

    // Max participants
    if (restrictions.max_participants) {
      const isUnlimited = restrictions.max_participants >= 999999;
      features.push(isUnlimited
        ? 'Unlimited participants per session'
        : `Up to ${restrictions.max_participants} participants per session`
      );
    }

    // Question limit
    if (restrictions.question_limit) {
      const isUnlimited = restrictions.question_limit >= 999999;
      features.push(isUnlimited
        ? 'Unlimited questions per session'
        : `Up to ${restrictions.question_limit} questions per session`
      );
    }

    // Additional features
    if (restrictions.customisable_sessions) {
      features.push('Customizable sessions');
    }

    if (restrictions.customisable_facilitators) {
      features.push('Customizable facilitators');
    }

    if (restrictions.saved_sessions) {
      features.push('Save sessions');
    }

    if (restrictions.session_reports) {
      features.push('Detailed session reports');
    }

    if (restrictions.data_export) {
      features.push('Export session data');
    }

    if (restrictions.priority_support) {
      features.push('Priority support');
    }

    if (restrictions.custom_branding) {
      features.push('Custom branding');
    }

    return features;
  };

  const planFeatures = getFeatureList();

  return (
    <div
      className={`
        glass-card p-8 rounded-2xl relative min-h-[700px] flex flex-col
        transition-all duration-300 ease-out
        hover:scale-105 hover:shadow-2xl
        ${isPlanPopular ? 'ring-2 ring-primary shadow-xl' : 'hover:ring-2 hover:ring-primary/50'}
        ${isCurrentPlan ? 'ring-2 ring-green-500' : ''}
        animate-fade-in-up
      `}
      style={{
        animationDelay: `${index * 100}ms`,
        animationFillMode: 'backwards'
      }}
    >
      {isPlanPopular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 animate-pulse">
          <span className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-4 py-1 rounded-full text-sm font-medium shadow-lg">
            ⭐ Most Popular
          </span>
        </div>
      )}

      {isCurrentPlan && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="bg-green-500 text-white px-4 py-1 rounded-full text-sm font-medium shadow-lg">
            ✓ Current Plan
          </span>
        </div>
      )}

      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold mb-2">{plan.title}</h3>
        {/* plan_type often duplicates title, only show if different */}
        {plan.plan_type && plan.plan_type !== plan.title && (
          <p className="text-muted-foreground">{plan.plan_type}</p>
        )}
      </div>

      <div className="text-center mb-8">
        {Number(plan.price) === 0 ? (
          <div>
            <div className="text-6xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Free
            </div>
            <div className="text-muted-foreground mt-1">/month</div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-center">
              <span className="text-yellow-500 text-2xl mr-1">
                {getCurrencySymbol(plan.currency || 'USD')}
              </span>
              <span className="text-6xl font-bold bg-gradient-to-r from-yellow-500 to-yellow-600 bg-clip-text text-transparent">
                {formatDisplayPrice(plan.price)}
              </span>
            </div>
            <div className="text-muted-foreground mt-1">/month</div>
          </>
        )}
      </div>

      <div className="flex-grow">
        <ul className="space-y-4 text-left">
          {planFeatures.map((feature, featureIndex) => (
            <li
              key={featureIndex}
              className="flex items-start gap-3 animate-fade-in-left"
              style={{
                animationDelay: `${(index * 100) + (featureIndex * 50)}ms`,
                animationFillMode: 'backwards'
              }}
            >
              <div className="text-yellow-500 mt-0.5 flex-shrink-0">
                {getFeatureIcon(feature)}
              </div>
              <span className="text-sm">{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      <Button
        className={`
          w-full mt-8 transition-all duration-300
          ${isPlanPopular || !isCurrentPlan ? 'bg-yellow-500 hover:bg-yellow-600 text-black hover:scale-105' : ''}
          ${isCurrentPlan ? 'hover:scale-105' : ''}
        `}
        variant={isCurrentPlan ? "outline" : "default"}
        onClick={handleGetStarted}
      >
        {isCurrentPlan ? "Manage Plan" : "Get Started"}
      </Button>
    </div>
  );
};
