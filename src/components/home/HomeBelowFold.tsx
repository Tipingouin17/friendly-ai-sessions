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
            title="Everything you need to run great workshops"
            subtitle="AIfacilitator combines the expertise of a professional facilitator with the scalability of AI."
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: <Sparkles className="h-6 w-6 text-indigo-600" />,
                title: 'AI-Powered Guidance',
                description: 'Intelligent facilitators that adapt to your team\'s needs in real time.',
              },
              {
                icon: <Users className="h-6 w-6 text-indigo-600" />,
                title: 'Multi-Participant Sessions',
                description: 'Bring your whole team together with seamless multi-user support.',
              },
              {
                icon: <MessageSquare className="h-6 w-6 text-indigo-600" />,
                title: 'Structured Conversations',
                description: 'Keep discussions focused and productive with proven facilitation frameworks.',
              },
              {
                icon: <BarChart3 className="h-6 w-6 text-indigo-600" />,
                title: 'Session Analytics',
                description: 'Get insights into participation, engagement, and outcomes after every session.',
              },
              {
                icon: <Settings className="h-6 w-6 text-indigo-600" />,
                title: 'Fully Customisable',
                description: 'Tailor facilitator personas, agendas, and workflows to your exact needs.',
              },
              {
                icon: <Shield className="h-6 w-6 text-indigo-600" />,
                title: 'Enterprise-Grade Security',
                description: 'Your data is encrypted and never used to train AI models.',
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
            title="Up and running in minutes"
            subtitle="No setup, no training, no hassle."
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '1', icon: <Globe className="h-6 w-6 text-indigo-600" />, title: 'Choose a Facilitator', description: 'Pick from our library of expert AI facilitators or create your own.' },
              { step: '2', icon: <Clock className="h-6 w-6 text-indigo-600" />, title: 'Invite Your Team', description: 'Share a link — participants join instantly, no account required.' },
              { step: '3', icon: <TrendingUp className="h-6 w-6 text-indigo-600" />, title: 'Run Your Session', description: 'The AI facilitator guides the conversation and captures outcomes.' },
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
          <SectionHeading title="Loved by teams everywhere" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { quote: 'AIfacilitator cut our meeting time in half while doubling the quality of our decisions.', author: 'Sarah K.', role: 'Product Lead' },
              { quote: 'Finally, a tool that keeps remote teams engaged and on track without a dedicated facilitator.', author: 'Marcus T.', role: 'Engineering Manager' },
              { quote: 'The AI adapts to our team dynamics in a way I didn\'t think was possible. Genuinely impressive.', author: 'Priya M.', role: 'Agile Coach' },
            ].map(t => (
              <div key={t.author} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />)}
                </div>
                <p className="text-gray-700 text-sm leading-relaxed mb-4">&ldquo;{t.quote}&rdquo;</p>
                <div>
                  <div className="font-semibold text-gray-900 text-sm">{t.author}</div>
                  <div className="text-gray-500 text-xs">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 px-4 bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 text-center">
            {isAuthenticated ? 'Ready to start your next session?' : 'Ready to transform your workshops?'}
          </h2>
          <p className="text-base md:text-lg text-indigo-100 mb-10 max-w-xl mx-auto text-center px-2">
            {isAuthenticated
              ? 'Head to your facilitators and kick off a session in seconds.'
              : 'Register today, contact Julia after sign-up, and get your tester-only 3-month AIfacilitator trial activated for free.'}
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
                  See Pricing
                </Button>
              </Link>
            )}
          </div>
          {!isAuthenticated && (
            <div className="flex flex-wrap justify-center gap-4 md:gap-6 text-sm text-indigo-100">
              {['3 months free for testers', 'No credit card required', 'Manual activation after registration'].map(item => (
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
