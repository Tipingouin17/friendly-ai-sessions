import { Link } from 'react-router-dom';
import SectionHeading from '@/components/SectionHeading';
import { Button } from '@/components/ui/button';
import {
  Users,
  MessageSquare,
  BarChart3,
  Sparkles,
  ArrowRight,
  Clock,
  TrendingUp,
  Globe,
  Settings,
  CheckCircle2,
  Shield,
  Star,
} from 'lucide-react';

interface HomeBelowFoldProps {
  isAuthenticated: boolean;
  primaryCtaHref: string;
  primaryCtaLabel: string;
  onPrimaryCta: (location: string) => void;
  onPricingCta: (location: string) => void;
}

const HomeBelowFold = ({
  isAuthenticated,
  primaryCtaHref,
  primaryCtaLabel,
  onPrimaryCta,
  onPricingCta,
}: HomeBelowFoldProps) => {
  return (
    <>
      <section className="py-16 md:py-24 px-4 bg-gray-50">
        <div className="container mx-auto max-w-6xl">
          <SectionHeading
            title="Everything teams need to move from discussion to action"
            subtitle="AIfacilitator combines the structure of a professional facilitator with the speed of an AI guide that is available whenever your team needs clarity."
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: <Sparkles className="h-6 w-6 text-indigo-600" />,
                title: 'Real-time AI facilitation',
                description: 'The AI facilitator asks the right questions, keeps the session moving, and adapts prompts to the outcome you need.',
              },
              {
                icon: <Users className="h-6 w-6 text-indigo-600" />,
                title: 'Multi-participant sessions',
                description: 'Invite teammates with a simple link and keep everyone aligned across remote, hybrid, or in-person workshops.',
              },
              {
                icon: <MessageSquare className="h-6 w-6 text-indigo-600" />,
                title: 'Structured conversations',
                description: 'Turn open discussion into priorities, decisions, risks, and next steps without forcing the team into a rigid script.',
              },
              {
                icon: <BarChart3 className="h-6 w-6 text-indigo-600" />,
                title: 'Actionable summaries',
                description: 'Leave every session with a clear record of key contributions, decisions made, and actions to follow up on.',
              },
              {
                icon: <Settings className="h-6 w-6 text-indigo-600" />,
                title: 'Simple first-session path',
                description: 'Start with a guided demo, create a real session from a template, or explore the product before inviting others.',
              },
              {
                icon: <Shield className="h-6 w-6 text-indigo-600" />,
                title: 'Designed for trust',
                description: 'Experience value alone first, then bring in colleagues once the format, flow, and output are clear.',
              },
            ].map(feature => (
              <div key={feature.title} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-50 mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 px-4 bg-white">
        <div className="container mx-auto max-w-5xl">
          <SectionHeading
            title="Reach first facilitated value in minutes"
            subtitle="The first experience is designed to avoid a blank dashboard after signup and guide every new user toward a concrete, useful next step."
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '1',
                icon: <Globe className="h-6 w-6 text-indigo-600" />,
                title: 'Choose your starting point',
                description: 'Try a two-minute demo, create from a template, or watch a quick walkthrough so the next action is obvious.',
              },
              {
                step: '2',
                icon: <Clock className="h-6 w-6 text-indigo-600" />,
                title: 'Let AI frame the session',
                description: 'The facilitator proposes the structure, questions, and transitions that keep the conversation productive.',
              },
              {
                step: '3',
                icon: <TrendingUp className="h-6 w-6 text-indigo-600" />,
                title: 'Leave with clear outcomes',
                description: 'End with a summary of priorities, decisions, and next actions that can be shared with the team immediately.',
              },
            ].map(item => (
              <div key={item.step} className="text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-50 mb-4 relative">
                  {item.icon}
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">{item.step}</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 px-4 bg-gray-50">
        <div className="container mx-auto max-w-5xl">
          <SectionHeading
            title="Use it when the team needs to move forward"
            subtitle="AIfacilitator is built for moments where a conversation needs structure, pace, and a visible outcome."
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                quote: 'We need to decide without going in circles.',
                author: 'Decision meeting',
                role: 'Clarify options, compare criteria, and turn a group discussion into agreed next actions.',
              },
              {
                quote: 'Our retrospective needs to produce more than a list of problems.',
                author: 'Agile retrospective',
                role: 'Surface insights, prioritize improvements, and help the team commit to a practical follow-up plan.',
              },
              {
                quote: 'We need alignment before we launch the project.',
                author: 'Collaborative kickoff',
                role: 'Share context, converge on expectations, and document early decisions before work begins.',
              },
            ].map(t => (
              <div key={t.author} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="flex gap-1 mb-4" aria-label="Priority use case">
                  {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />)}
                </div>
                <p className="text-gray-700 text-sm leading-relaxed mb-4">&ldquo;{t.quote}&rdquo;</p>
                <div>
                  <div className="font-semibold text-gray-900 text-sm">{t.author}</div>
                  <div className="text-gray-500 text-xs leading-relaxed mt-1">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 px-4 bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 text-center">
            {isAuthenticated ? 'Ready to start your next workshop?' : 'Ready to try AI facilitation?'}
          </h2>
          <p className="text-base md:text-lg text-indigo-100 mb-10 max-w-xl mx-auto text-center px-2">
            {isAuthenticated
              ? 'Open your facilitators and start a structured demo or real session in a few moments.'
              : 'Create an account, experience the guided first-step flow, and then request 3 months of free tester access.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8 px-4 sm:px-0">
            <Link to={primaryCtaHref} className="w-full sm:w-auto" onClick={() => onPrimaryCta('home_bottom_cta')}>
              <Button
                size="lg"
                className="w-full sm:w-auto text-base font-semibold px-10 py-6 bg-white text-indigo-700 hover:bg-indigo-50 border-0 shadow-xl shadow-indigo-900/30 transition-colors rounded-xl"
              >
                {primaryCtaLabel}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            {!isAuthenticated && (
              <Link to="/pricing" className="w-full sm:w-auto" onClick={() => onPricingCta('home_bottom_cta')}>
                <Button
                  size="lg"
                  className="w-full sm:w-auto text-base font-semibold px-10 py-6 bg-transparent border-2 border-white/60 text-white hover:bg-white/10 hover:border-white/80 transition-colors rounded-xl"
                >
                  View plans
                </Button>
              </Link>
            )}
          </div>
          {!isAuthenticated && (
            <div className="flex flex-wrap justify-center gap-4 md:gap-6 text-sm text-indigo-100">
              {['3 months free for testers', 'No credit card required', 'Tester access after signup'].map(item => (
                <span key={item} className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-indigo-200" />
                  {item}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
};

export default HomeBelowFold;
