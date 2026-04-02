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
      case 'EUR': return '€';
      case 'GBP': return '£';
      case 'USD':
      default: return '$';
    }
  };

  const formatDisplayPrice = (price: number | string) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(numPrice) || numPrice === 0) return 'Free';
    return Number.isInteger(numPrice) ? numPrice.toString() : numPrice.toFixed(2);
  };

  const isPlanPopular = plan.is_popular;

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

    if (restrictions.facilitator_limit) {
      const isUnlimited = restrictions.facilitator_limit >= 999999;
      features.push(isUnlimited ? 'Unlimited facilitators' : `${restrictions.facilitator_limit} ${restrictions.facilitator_limit === 1 ? 'facilitator' : 'facilitators'}`);
    }
    if (restrictions.session_limit) {
      const isUnlimited = restrictions.session_limit >= 999999;
      features.push(isUnlimited ? 'Unlimited sessions per month' : `${restrictions.session_limit} sessions per month`);
    }
    if (restrictions.max_participants) {
      const isUnlimited = restrictions.max_participants >= 999999;
      features.push(isUnlimited ? 'Unlimited participants per session' : `Up to ${restrictions.max_participants} participants per session`);
    }
    if (restrictions.question_limit) {
      const isUnlimited = restrictions.question_limit >= 999999;
      features.push(isUnlimited ? 'Unlimited questions per session' : `Up to ${restrictions.question_limit} questions per session`);
    }
    if (restrictions.customisable_sessions) features.push('Customizable sessions');
    if (restrictions.customisable_facilitators) features.push('Customizable facilitators');
    if (restrictions.saved_sessions) features.push('Save sessions');
    if (restrictions.session_reports) features.push('Detailed session reports');
    if (restrictions.data_export) features.push('Export session data');
    if (restrictions.priority_support) features.push('Priority support');
    if (restrictions.custom_branding) features.push('Custom branding');

    return features;
  };

  const planFeatures = getFeatureList();
  const isFree = Number(plan.price) === 0;

  // Determine badge to show — priority: current plan > popular
  const showCurrentBadge = isCurrentPlan;
  const showPopularBadge = isPlanPopular && !isCurrentPlan;

  return (
    <div
      className={`
        relative rounded-2xl flex flex-col min-h-[680px]
        transition-all duration-300 ease-out
        hover:-translate-y-1 hover:shadow-xl
        animate-fade-in-up
        ${isPlanPopular
          ? 'bg-gradient-to-b from-indigo-600 to-indigo-700 text-white shadow-xl shadow-indigo-500/30'
          : 'bg-white border border-gray-100 shadow-sm hover:border-indigo-100'
        }
        ${isCurrentPlan && !isPlanPopular ? 'ring-2 ring-indigo-500' : ''}
      `}
      style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'backwards' }}
    >
      {/* Single badge — positioned above card, centered */}
      {(showCurrentBadge || showPopularBadge) && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10 whitespace-nowrap">
          {showCurrentBadge ? (
            <span className="inline-flex items-center gap-1.5 bg-emerald-500 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg tracking-wide uppercase">
              <Check className="h-3 w-3" />
              Current Plan
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 bg-white text-indigo-700 px-4 py-1.5 rounded-full text-xs font-bold shadow-lg border border-indigo-100 tracking-wide uppercase">
              ⭐ Most Popular
            </span>
          )}
        </div>
      )}

      <div className={`p-8 flex flex-col flex-1 ${showCurrentBadge || showPopularBadge ? 'pt-10' : ''}`}>
        {/* Plan name */}
        <div className="mb-6">
          <h3 className={`text-xl font-bold mb-1 text-center ${isPlanPopular ? 'text-white' : 'text-gray-900'}`}>
            {plan.title}
          </h3>
          <p className={`text-sm text-center ${isPlanPopular ? 'text-indigo-200' : 'text-gray-400'}`}>
            {isFree ? 'Perfect to get started' : isPlanPopular ? 'Best for growing teams' : 'For power users'}
          </p>
        </div>

        {/* Price */}
        <div className="mb-8">
          {isFree ? (
            <div className="text-center">
              <div className={`text-5xl font-extrabold ${isPlanPopular ? 'text-white' : 'text-gray-900'}`}>Free</div>
              <div className={`text-sm mt-1 ${isPlanPopular ? 'text-indigo-200' : 'text-gray-400'}`}>forever</div>
            </div>
          ) : (
            <div className="text-center">
              <div className="flex items-end justify-center gap-1">
                <span className={`text-5xl font-extrabold leading-none ${isPlanPopular ? 'text-white' : 'text-gray-900'}`}>
                  {formatDisplayPrice(plan.price)}
                </span>
                <span className={`text-2xl font-bold mb-1 ${isPlanPopular ? 'text-indigo-200' : 'text-gray-500'}`}>
                  {getCurrencySymbol(plan.currency || 'USD')}
                </span>
              </div>
              <div className={`text-sm mt-1 ${isPlanPopular ? 'text-indigo-200' : 'text-gray-400'}`}>/month</div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className={`mb-6 h-px ${isPlanPopular ? 'bg-indigo-500' : 'bg-gray-100'}`} />

        {/* Features */}
        <ul className="space-y-3 flex-1">
          {planFeatures.map((feature, featureIndex) => (
            <li key={featureIndex} className="flex items-start gap-3">
              <div className={`mt-0.5 flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full ${
                isPlanPopular ? 'bg-indigo-500 text-white' : 'bg-indigo-50 text-indigo-600'
              }`}>
                <Check className="h-3 w-3" />
              </div>
              <span className={`text-sm ${isPlanPopular ? 'text-indigo-100' : 'text-gray-600'}`}>{feature}</span>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <div className="mt-8">
          {isCurrentPlan ? (
            <Button
              className="w-full py-5 font-semibold rounded-xl border-2 border-emerald-400 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-all"
              variant="outline"
              onClick={handleGetStarted}
            >
              ✓ Current Plan — Manage
            </Button>
          ) : isPlanPopular ? (
            <Button
              className="w-full py-5 font-semibold rounded-xl bg-white text-indigo-700 hover:bg-indigo-50 shadow-lg transition-all"
              onClick={handleGetStarted}
            >
              {isFree ? 'Get Started Free' : 'Get Started'}
            </Button>
          ) : (
            <Button
              className="w-full py-5 font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-500/20 transition-all"
              onClick={handleGetStarted}
            >
              {isFree ? 'Get Started Free' : 'Get Started'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
