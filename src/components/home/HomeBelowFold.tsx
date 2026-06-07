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
            title="Tout ce qu’il faut pour passer de la discussion à l’action"
            subtitle="AIfacilitator combine la structure d’un facilitateur professionnel avec la rapidité d’une IA disponible à la demande."
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: <Sparkles className="h-6 w-6 text-indigo-600" />,
                title: 'Guidage IA en temps réel',
                description: 'Le facilitateur IA pose les bonnes questions, relance les échanges et adapte le rythme à votre contexte.',
              },
              {
                icon: <Users className="h-6 w-6 text-indigo-600" />,
                title: 'Sessions multi-participants',
                description: 'Invitez votre équipe avec un simple lien et gardez tout le monde aligné, à distance comme en hybride.',
              },
              {
                icon: <MessageSquare className="h-6 w-6 text-indigo-600" />,
                title: 'Conversations structurées',
                description: 'Transformez les échanges ouverts en priorités, décisions, risques et prochaines étapes concrètes.',
              },
              {
                icon: <BarChart3 className="h-6 w-6 text-indigo-600" />,
                title: 'Synthèse exploitable',
                description: 'Obtenez une trace claire de la session : contributions clés, décisions prises et actions à suivre.',
              },
              {
                icon: <Settings className="h-6 w-6 text-indigo-600" />,
                title: 'Parcours de démarrage simple',
                description: 'Commencez par une démo guidée, créez une première session ou explorez le fonctionnement pas à pas.',
              },
              {
                icon: <Shield className="h-6 w-6 text-indigo-600" />,
                title: 'Pensé pour la confiance',
                description: 'Essayez d’abord sans risque social, puis invitez l’équipe quand le format et la valeur sont clairs.',
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
            title="Une première valeur en quelques minutes"
            subtitle="Le parcours est conçu pour éviter l’écran vide après l’inscription et guider chaque nouvel utilisateur vers une action utile."
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '1',
                icon: <Globe className="h-6 w-6 text-indigo-600" />,
                title: 'Choisissez votre point de départ',
                description: 'Démo guidée, première session ou découverte pas à pas : vous savez immédiatement quoi faire ensuite.',
              },
              {
                step: '2',
                icon: <Clock className="h-6 w-6 text-indigo-600" />,
                title: 'Laissez l’IA cadrer l’atelier',
                description: 'Le facilitateur propose la structure, les questions et les transitions pour garder l’échange productif.',
              },
              {
                step: '3',
                icon: <TrendingUp className="h-6 w-6 text-indigo-600" />,
                title: 'Repartez avec des décisions',
                description: 'La session se termine avec une synthèse, des priorités et des prochaines actions prêtes à partager.',
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
            title="Des cas d’usage pour les moments où l’équipe doit avancer"
            subtitle="Utilisez AIfacilitator quand la conversation a besoin d’un cadre, d’un rythme et d’un résultat visible."
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                quote: 'Nous voulons décider sans tourner en rond.',
                author: 'Atelier de décision',
                role: 'Clarifier les options, comparer les critères et choisir les prochaines actions.',
              },
              {
                quote: 'Notre rétro doit produire autre chose qu’une liste de problèmes.',
                author: 'Rétrospective agile',
                role: 'Faire émerger les apprentissages, prioriser les irritants et engager l’équipe sur un plan d’amélioration.',
              },
              {
                quote: 'Nous devons aligner le groupe avant de lancer le projet.',
                author: 'Cadrage collaboratif',
                role: 'Partager le contexte, faire converger les attentes et documenter les décisions dès le départ.',
              },
            ].map(t => (
              <div key={t.author} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="flex gap-1 mb-4" aria-label="Cas d’usage prioritaire">
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
            {isAuthenticated ? 'Prêt à lancer votre prochain atelier ?' : 'Prêt à tester une facilitation IA ?'}
          </h2>
          <p className="text-base md:text-lg text-indigo-100 mb-10 max-w-xl mx-auto text-center px-2">
            {isAuthenticated
              ? 'Accédez à vos facilitateurs et démarrez une session structurée en quelques instants.'
              : 'Créez un compte, testez le parcours de démarrage et demandez ensuite l’activation de votre offre testeur de 3 mois gratuits.'}
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
                  Voir les offres
                </Button>
              </Link>
            )}
          </div>
          {!isAuthenticated && (
            <div className="flex flex-wrap justify-center gap-4 md:gap-6 text-sm text-indigo-100">
              {['3 mois gratuits pour les testeurs', 'Sans carte bancaire', 'Activation testeur après inscription'].map(item => (
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
