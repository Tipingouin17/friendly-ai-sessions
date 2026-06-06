/**
 * Index (Home Page)
 *
 * Marketing landing page for the AIfacilitator application.
 * CTA buttons are auth-aware: authenticated users are directed to
 * /my-facilitators while anonymous visitors are sent to /signup.
 */
import { lazy, Suspense, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHead from '@/components/PageHead';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { trackCtaClick, trackLeadIntent } from '@/lib/tracking';
import { Zap, ArrowRight, Gift, BadgeCheck } from 'lucide-react';

const HomeBelowFold = lazy(() => import('@/components/home/HomeBelowFold'));

const SCHEMA_FAQ_HOME = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is AIfacilitator?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'AIfacilitator is an AI-native workshop facilitation platform that provides expert AI facilitators to guide teams through structured conversations, decisions, and outcomes. It replaces or augments traditional human facilitators for design sprints, retrospectives, strategic planning sessions, and more.',
      },
    },
    {
      '@type': 'Question',
      name: 'How does AI workshop facilitation work?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'AIfacilitator uses large language models (LLMs) to dynamically generate workshop agendas, guide participants through each phase in real time, adapt to the conversation as it unfolds, and produce post-session summaries and insights. Teams interact with the AI facilitator through a chat interface during the session.',
      },
    },
    {
      '@type': 'Question',
      name: 'Who is AIfacilitator for?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'AIfacilitator is designed for product managers running design sprints, agile coaches and Scrum Masters facilitating retrospectives, HR and L&D professionals running team workshops, and consultants who facilitate sessions for clients. It works for both remote/hybrid teams and in-person groups.',
      },
    },
    {
      '@type': 'Question',
      name: 'What types of workshops can AIfacilitator run?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'AIfacilitator supports design sprints, agile retrospectives, strategic planning sessions, team-building workshops, brainstorming sessions, and decision-making meetings. The AI adapts its facilitation style to the specific workshop type and team goals.',
      },
    },
    {
      '@type': 'Question',
      name: 'How is AIfacilitator different from Miro or SessionLab?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Unlike Miro (a visual collaboration whiteboard) or SessionLab (a workshop agenda planner), AIfacilitator is an active AI facilitator that participates in and guides the session in real time. It does not just provide a canvas or template — it acts as an intelligent co-facilitator that adapts dynamically to the conversation.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is AIfacilitator free to use?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'AIfacilitator offers a free plan to get started and run your first AI-facilitated sessions. Paid plans are available for teams that need more sessions, advanced analytics, and additional AI facilitator customization.',
      },
    },
  ],
};

const SCHEMA_SOFTWARE_APPLICATION = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'AIfacilitator',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  url: 'https://aifacilitator.ai/',
  description: 'AIfacilitator is an AI-powered workshop facilitation platform for design sprints, agile retrospectives, strategic planning, brainstorming, team alignment, and remote workshops.',
  offers: {
    '@type': 'Offer',
    name: 'AIfacilitator Free plan',
    price: '0',
    priceCurrency: 'EUR',
    availability: 'https://schema.org/InStock',
    url: 'https://aifacilitator.ai/pricing',
    description: 'Free plan available; paid AIfacilitator plans start at €19 per month.',
  },
  featureList: [
    'AI-guided workshop facilitation',
    'Design sprint facilitation',
    'Agile retrospective facilitation',
    'Strategic planning workshops',
    'Participant invitation links',
    'Session reports and action items',
    'Remote and hybrid team workshops',
  ],
  audience: {
    '@type': 'Audience',
    audienceType: 'Product managers, agile teams, Scrum Masters, innovation teams, consultants, facilitators, HR teams, and remote teams',
  },
};

const SCHEMA_ORGANIZATION = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'AIfacilitator',
  url: 'https://aifacilitator.ai/',
  logo: 'https://aifacilitator.ai/og-image.png',
  sameAs: [
    'https://www.linkedin.com/company/aifacilitator',
    'https://twitter.com/aifacilitator',
    'https://www.producthunt.com/products/aifacilitator',
    'https://www.g2.com/products/aifacilitator',
  ],
};

const SCHEMA_WEBSITE = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'AIfacilitator',
  url: 'https://aifacilitator.ai/',
  description: 'AI-powered workshop facilitation for teams that need structured conversations, better decisions, and clear action items.',
};

function useDeferredHomepageSections() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const run = () => window.setTimeout(() => setReady(true), 900);

    if (document.readyState === 'complete') {
      const timeoutId = run();
      return () => window.clearTimeout(timeoutId);
    }

    window.addEventListener('load', run, { once: true });
    return () => window.removeEventListener('load', run);
  }, []);

  return ready;
}

const Index = () => {
  const { isAuthenticated } = useAuth();
  const showBelowFold = useDeferredHomepageSections();

  /** Primary CTA destination — logged-in users go straight to their workshops. */
  const primaryCtaHref = isAuthenticated ? '/my-facilitators' : '/signup';
  const primaryCtaLabel = isAuthenticated ? 'Go to My Workshops' : 'Start Your Free AI-Facilitated Workshop';

  const handlePrimaryCta = (location: string) => {
    trackCtaClick('home_primary_cta', primaryCtaHref, location);
    if (!isAuthenticated) {
      trackLeadIntent('home_signup_intent', primaryCtaHref);
    }
  };

  const handlePricingCta = (location: string) => {
    trackCtaClick('home_pricing_cta', '/pricing', location);
    trackLeadIntent('home_pricing_intent', '/pricing');
  };

  return (
    <div className="min-h-screen bg-white">
      <PageHead
        title="AI Workshop Facilitation Software for Teams"
        description="AIfacilitator is an AI-powered workshop facilitation platform for design sprints, agile retrospectives, strategic planning, brainstorming and remote team workshops."
        canonical="https://aifacilitator.ai/"
        jsonLd={[SCHEMA_SOFTWARE_APPLICATION, SCHEMA_ORGANIZATION, SCHEMA_WEBSITE, SCHEMA_FAQ_HOME]}
      />

      <section className="relative pt-28 pb-16 md:pb-24 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-violet-50 pointer-events-none" />
        <div className="absolute top-10 right-[10%] w-72 h-72 bg-indigo-200/40 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-[5%] w-96 h-96 bg-violet-200/30 rounded-full blur-3xl pointer-events-none" />

        <div className="relative container mx-auto max-w-5xl text-center">
          <span className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full bg-indigo-100 text-indigo-700 text-sm font-semibold tracking-wide border border-indigo-200">
            <Zap className="h-3.5 w-3.5" aria-hidden="true" />
            Tester-only launch offer: 3 months free
          </span>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold mb-6 leading-[1.1] tracking-tight text-center">
            <span className="text-gray-900">Automate Workshop</span>
            <br />
            <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-500 bg-clip-text text-transparent">
              Facilitation with AI
            </span>
          </h1>

          <p className="text-lg md:text-xl lg:text-2xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed text-center px-2">
            Streamline workshops, capture decisions, and drive action with AI-powered facilitation. Focus on outcomes, not notes.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10 px-4 sm:px-0">
            <Link to={primaryCtaHref} className="w-full sm:w-auto" onClick={() => handlePrimaryCta('home_hero')}>
              <Button
                size="lg"
                className="w-full sm:w-auto text-base font-semibold px-8 py-6 bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all rounded-xl"
              >
                {primaryCtaLabel}
                <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
              </Button>
            </Link>
            <Link to="/pricing" className="w-full sm:w-auto" onClick={() => handlePricingCta('home_hero')}>
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto text-base font-semibold px-8 py-6 border-2 border-gray-200 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all rounded-xl"
              >
                View Pricing
              </Button>
            </Link>
          </div>

          {!isAuthenticated && (
            <div className="mb-8 mx-auto max-w-3xl rounded-2xl border border-indigo-100 bg-white/90 p-4 text-left shadow-sm backdrop-blur">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-xl bg-indigo-100 p-2 text-indigo-600">
                    <Gift className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Exclusive tester access: 3 months free</p>
                    <p className="mt-1 text-sm text-gray-600">
                      Register now, then contact Julia with your account email and we will activate your extended free trial manually.
                    </p>
                  </div>
                </div>
                <div className="grid gap-1 text-xs font-medium text-gray-600 sm:min-w-44">
                  {['No credit card required', 'Tester-only activation', 'Built for live workshops'].map(item => (
                    <span key={item} className="flex items-center gap-1.5">
                      <BadgeCheck className="h-3.5 w-3.5 text-indigo-500" aria-hidden="true" />
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8 px-4 py-5 rounded-2xl bg-white border border-gray-100 shadow-sm max-w-lg sm:max-w-none mx-auto">
            {[
              { value: '10,000+', label: 'Workshops Facilitated' },
              { value: '500+', label: 'Teams Empowered' },
              { value: '98%', label: 'Facilitator Satisfaction' },
              { value: '40%', label: 'Time Saved Per Session' },
            ].map(stat => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-indigo-600">{stat.value}</div>
                <div className="text-xs sm:text-sm text-gray-600 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {showBelowFold && (
        <Suspense fallback={null}>
          <HomeBelowFold
            isAuthenticated={isAuthenticated}
            primaryCtaHref={primaryCtaHref}
            primaryCtaLabel={primaryCtaLabel}
            onPrimaryCta={handlePrimaryCta}
            onPricingCta={handlePricingCta}
          />
        </Suspense>
      )}
    </div>
  );
};

export default Index;
