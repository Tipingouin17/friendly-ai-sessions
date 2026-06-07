/**
 * Index (Home Page)
 *
 * French-first marketing landing page for the AIfacilitator application.
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
  inLanguage: 'fr-FR',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Qu’est-ce qu’AIfacilitator ?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'AIfacilitator est une plateforme de facilitation d’ateliers par IA. Elle guide les équipes dans des conversations structurées, aide à prendre des décisions et produit des synthèses actionnables après la session.',
      },
    },
    {
      '@type': 'Question',
      name: 'Comment fonctionne une facilitation d’atelier par IA ?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'L’IA propose un cadre d’atelier, guide les participants étape par étape, relance les échanges quand c’est nécessaire et transforme les contributions en priorités, décisions et prochaines actions.',
      },
    },
    {
      '@type': 'Question',
      name: 'À qui s’adresse AIfacilitator ?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'AIfacilitator s’adresse aux product managers, coachs agiles, Scrum Masters, responsables RH, consultants, équipes innovation et organisations hybrides qui veulent animer de meilleurs ateliers sans dépendre d’un facilitateur dédié à chaque fois.',
      },
    },
    {
      '@type': 'Question',
      name: 'Quels types d’ateliers puis-je lancer ?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'La plateforme peut accompagner des rétrospectives agiles, ateliers de décision, brainstormings, alignements d’équipe, sessions de cadrage, ateliers de priorisation et formats collaboratifs à distance ou en présentiel.',
      },
    },
    {
      '@type': 'Question',
      name: 'En quoi AIfacilitator est différent d’un tableau blanc ou d’un modèle d’agenda ?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Un tableau blanc fournit un espace de collaboration et un modèle d’agenda décrit une structure. AIfacilitator agit comme un co-facilitateur actif : il guide la discussion, adapte les questions au contexte et capture les résultats en temps réel.',
      },
    },
    {
      '@type': 'Question',
      name: 'Puis-je essayer AIfacilitator gratuitement ?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Oui. Vous pouvez créer un compte gratuitement pour tester une première expérience facilitée par IA. Une offre testeur permet également d’obtenir trois mois gratuits pendant la phase de lancement.',
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
  inLanguage: 'fr-FR',
  description: 'AIfacilitator est une plateforme web de facilitation d’ateliers par IA pour rétrospectives agiles, décisions d’équipe, brainstormings, alignement stratégique et ateliers hybrides.',
  offers: {
    '@type': 'Offer',
    name: 'Plan gratuit AIfacilitator',
    price: '0',
    priceCurrency: 'EUR',
    availability: 'https://schema.org/InStock',
    url: 'https://aifacilitator.ai/pricing',
    description: 'Plan gratuit disponible pour démarrer ; des formules payantes existent pour les équipes qui ont besoin de plus de sessions et de personnalisation.',
  },
  featureList: [
    'Facilitation d’atelier guidée par IA',
    'Rétrospectives agiles et ateliers de décision',
    'Sessions structurées pour équipes distantes et hybrides',
    'Liens d’invitation pour participants',
    'Synthèses, décisions et prochaines actions',
    'Parcours de démonstration et première session rapide',
  ],
  audience: {
    '@type': 'Audience',
    audienceType: 'Product managers, coachs agiles, Scrum Masters, consultants, facilitateurs, équipes RH, équipes innovation et équipes distribuées',
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
  inLanguage: 'fr-FR',
  description: 'Facilitation d’ateliers par IA pour des conversations structurées, de meilleures décisions et des actions claires.',
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

function useFrenchDocumentLanguage() {
  useEffect(() => {
    const previousLang = document.documentElement.lang;
    document.documentElement.lang = 'fr';

    return () => {
      document.documentElement.lang = previousLang || 'en';
    };
  }, []);
}

const Index = () => {
  const { isAuthenticated } = useAuth();
  const showBelowFold = useDeferredHomepageSections();
  useFrenchDocumentLanguage();

  /** Primary CTA destination — logged-in users go straight to their workshops. */
  const primaryCtaHref = isAuthenticated ? '/my-facilitators' : '/signup';
  const primaryCtaLabel = isAuthenticated ? 'Accéder à mes ateliers' : 'Tester une session IA gratuite';

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
        title="Facilitation d’ateliers par IA pour équipes"
        description="AIfacilitator guide vos ateliers, rétrospectives et sessions de décision avec une IA facilitatrice qui structure les échanges, capte les décisions et transforme les idées en actions."
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
            Offre de lancement testeur : 3 mois gratuits
          </span>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold mb-6 leading-[1.1] tracking-tight text-center">
            <span className="text-gray-900">Animez vos ateliers</span>
            <br />
            <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-500 bg-clip-text text-transparent">
              avec un facilitateur IA
            </span>
          </h1>

          <p className="text-lg md:text-xl lg:text-2xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed text-center px-2">
            Lancez une première expérience en quelques minutes : l’IA structure la conversation, guide les participants, capture les décisions et transforme les échanges en prochaines actions.
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
                Voir les offres
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
                    <p className="text-sm font-semibold text-gray-900">Accès testeur exclusif : 3 mois gratuits</p>
                    <p className="mt-1 text-sm text-gray-600">
                      Créez votre compte gratuitement, essayez le parcours de démarrage, puis contactez Julia avec votre email de compte pour activer l’accès testeur étendu.
                    </p>
                  </div>
                </div>
                <div className="grid gap-1 text-xs font-medium text-gray-600 sm:min-w-48">
                  {['Sans carte bancaire', 'Première valeur rapide', 'Conçu pour de vrais ateliers'].map(item => (
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
              { value: '2 min', label: 'pour tester une démo guidée' },
              { value: '3', label: 'chemins d’activation clairs' },
              { value: '0', label: 'carte bancaire requise' },
              { value: '100%', label: 'orienté décisions et actions' },
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
