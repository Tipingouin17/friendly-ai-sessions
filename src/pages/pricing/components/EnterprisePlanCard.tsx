/**
 * Enterprise Plan Card
 *
 * Page for the AIfacilitator application.
 */

import { Check, Users, Calendar, UserPlus, MessageSquare, Wand2, Save, BarChart3, Download, Headphones, Palette, Building2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { trackCtaClick, trackLeadIntent } from "@/lib/tracking";

interface EnterprisePlanCardProps {
  onContactClick: () => void;
}

export const EnterprisePlanCard = ({ onContactClick }: EnterprisePlanCardProps) => {
  const navigate = useNavigate();

  const handleContactSales = () => {
    trackCtaClick('enterprise_contact_sales', '/contact', 'pricing_enterprise_card');
    trackLeadIntent('enterprise_contact_sales', '/contact');
    onContactClick();
  };

  const handleScheduleDemo = () => {
    trackCtaClick('enterprise_schedule_demo', '/contact', 'pricing_enterprise_card');
    trackLeadIntent('enterprise_schedule_demo', '/contact');
    navigate('/contact');
  };

  const enterpriseFeatures = [
    { icon: <Users className="h-4 w-4" />, text: "Unlimited facilitators" },
    { icon: <Calendar className="h-4 w-4" />, text: "Unlimited sessions per month" },
    { icon: <UserPlus className="h-4 w-4" />, text: "Unlimited participants" },
    { icon: <MessageSquare className="h-4 w-4" />, text: "Unlimited questions" },
    { icon: <Wand2 className="h-4 w-4" />, text: "Customizable sessions & facilitators" },
    { icon: <Save className="h-4 w-4" />, text: "Save & archive sessions" },
    { icon: <BarChart3 className="h-4 w-4" />, text: "Advanced session reports" },
    { icon: <Download className="h-4 w-4" />, text: "Export session data" },
    { icon: <Headphones className="h-4 w-4" />, text: "Dedicated account manager" },
    { icon: <Palette className="h-4 w-4" />, text: "Custom branding & white-label" },
    { icon: <Building2 className="h-4 w-4" />, text: "SSO & enterprise security" },
    { icon: <Check className="h-4 w-4" />, text: "SLA & uptime guarantee" },
  ];

  return (
    <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-8 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8">
        {/* Left: Plan info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-600">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900">Enterprise</h3>
              <p className="text-sm text-gray-400">For large organisations</p>
            </div>
          </div>
          <p className="text-gray-500 text-sm mb-5 leading-relaxed">
            Custom pricing, dedicated support, white-label options, and enterprise-grade security for organisations that need unlimited scale.
          </p>
          <div className="text-3xl font-extrabold text-indigo-600 mb-1">Custom Pricing</div>
          <p className="text-sm text-gray-400">Tailored to your organisation's requirements</p>

          <div className="flex flex-col sm:flex-row gap-3 mt-8">
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 rounded-xl font-semibold shadow-sm shadow-indigo-500/20 px-6"
              onClick={handleContactSales}
            >
              Contact Sales
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="rounded-xl border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-semibold px-6"
              onClick={handleScheduleDemo}
            >
              Schedule a Demo
            </Button>
          </div>
        </div>

        {/* Right: Features grid */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-indigo-600 uppercase tracking-widest mb-4">Everything in Premium, plus:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {enterpriseFeatures.map((feature, index) => (
              <div key={index} className="flex items-center gap-2.5 text-sm">
                <div className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 text-indigo-600">
                  <Check className="h-3 w-3" />
                </div>
                <span className="text-gray-600">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
