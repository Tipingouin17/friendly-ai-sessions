/**
 * Index (Home Page)
 *
 * English-only marketing landing page for the AIfacilitator application.
 * CTA buttons are auth-aware: authenticated users are directed toward the
 * guided demo preset while anonymous visitors are sent to signup.
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
  inLanguage: 'en',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is AIfacilitator?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'AIfacilitator is a web platform for AI-facilitated workshops. It guides teams through structured conversations, helps them make decisions, and turns session outputs into clear summaries and next actions.',
      },
    },
    {
      '@type': 'Question',
      name: 'How does an AI-facilitated workshop work?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'The AI facilitator frames the workshop, guides participants step by step, prompts the right questions, captures important contributions, and summarizes priorities, decisions, and action items.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I try AIfacilitator before inviting my team?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. New users are guided toward a low-risk first experience, such as a short demo-style session or a first session created from a template, before they need to invite real participants.',
      },
    },
    {
      '@type': 'Question',
      name: 'What types of sessions can I run?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'AIfacilitator can support brainstorming, retrospectives, decision meetings, planning workshops, feedback sessions, alignment conversations, and collaborative sessions for remote, hybrid, or in-person teams.',
      },
    },
    {
      '@type': 'Question',
      name: 'How is AIfacilitator different from a whiteboard or agenda template?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'A whiteboard gives teams a shared space, and an agenda template gives them a structure. AIfacilitator acts as an active co-facilitator by guiding the conversation, adapting prompts, and capturing useful outcomes as the session progresses.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I start for free?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. You can create an account and start exploring AIfacilitator for free. During launch, eligible testers can also request extended tester access.',
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
  inLanguage: 'en',
  description: 'AIfacilitator is a web platform for AI-facilitated workshops, retrospectives, decision meetings, brainstorming, alignment conversations, and hybrid team sessions.',
  offers: {
    '@type': 'Offer',
    name: 'AIfacilitator free plan',
    price: '0',
    priceCurrency: 'EUR',
    availability: 'https://schema.org/InStock',
    url: 'https://aifacilitator.ai/pricing',
    description: 'A free plan is available to get started, with paid plans for teams that need more sessions and customization.',
  },
  featureList: [
    'AI-guided workshop facilitation',
    'Retrospectives, brainstorming, and decision meetings',
    'Structured sessions for remote and hybrid teams',
    'Participant invitation links',
    'Summaries, decisions, and next actions',
    'Low-risk demo path and fast first-session setup',
  ],
  audience: {
    '@type': 'Audience',
    audienceType: 'Product managers, agile coaches, Scrum Masters, consultants, facilitators, HR teams, innovation teams, and distributed teams',
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
  inLanguage: 'en',
  description: 'AI-facilitated workshops for structured conversations, better decisions, clear summaries, and action-oriented team outcomes.',
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

function useEnglishDocumentLanguage() {
  useEffect(() => {
    const previousLang = document.documentElement.lang;
    document.documentElement.lang = 'en';

    return () => {
      document.documentElement.lang = previousLang || 'en';
    };
  }, []);
}

const Index = () => {
  const { isAuthenticated } = useAuth();
  const showBelowFold = useDeferredHomepageSections();
  useEnglishDocumentLanguage();

  /** Primary CTA destination — logged-in users go straight to the guided demo preset. */
  const primaryCtaHref = isAuthenticated ? '/my-facilitators?onboarding=demo' : '/signup';
  const primaryCtaLabel = isAuthenticated ? 'Start demo session' : 'Try a free AI session';

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
        title="AI-facilitated workshops for teams"
        description="Run your first AI-facilitated session with AIfacilitator. Start with a low-risk demo, create a structured workshop, and turn conversations into decisions and next actions."
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
            Launch tester access: 3 months free
          </span>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold mb-6 leading-[1.1] tracking-tight text-center">
            <span className="text-gray-900">Run your first</span>
            <br />
            <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-500 bg-clip-text text-transparent">
              AI-facilitated session
            </span>
          </h1>

          <p className="text-lg md:text-xl lg:text-2xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed text-center px-2">
            AIfacilitator helps teams move from open conversation to clear outcomes. Start with a safe demo, create a real session from a template, and let the AI facilitator guide the flow, capture decisions, and turn ideas into next actions.
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
                View plans
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
                    <p className="text-sm font-semibold text-gray-900">Tester access: start free, then unlock 3 months</p>
                    <p className="mt-1 text-sm text-gray-600">
                      Create your account, experience the guided first-step flow, and contact Julia with your account email to activate extended tester access.
                    </p>
                  </div>
                </div>
                <div className="grid gap-1 text-xs font-medium text-gray-600 sm:min-w-48">
                  {['No credit card required', 'Fast first value', 'Built for real team sessions'].map(item => (
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
              { value: '2 min', label: 'to try a guided demo' },
              { value: '3', label: 'clear activation paths' },
              { value: '0', label: 'credit card required' },
              { value: '100%', label: 'focused on decisions and actions' },
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
