/**
 * Comparison: AIfacilitator vs Miro
 * SEO target: "AIfacilitator vs Miro", "Miro alternative for workshops"
 */
import React from 'react';
import { Link } from 'react-router-dom';
import PageHead from '@/components/PageHead';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, ArrowRight, Minus } from 'lucide-react';

const SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'AIfacilitator vs Miro: Which is Better for Workshop Facilitation?',
  description:
    'A detailed comparison of AIfacilitator and Miro for workshop facilitation. Understand the key differences between AI-powered facilitation and visual collaboration whiteboards to choose the right tool for your team.',
  author: { '@type': 'Organization', name: 'AIfacilitator', url: 'https://aifacilitator.ai' },
  publisher: {
    '@type': 'Organization',
    name: 'AIfacilitator',
    logo: { '@type': 'ImageObject', url: 'https://aifacilitator.ai/apple-touch-icon.png' },
  },
  url: 'https://aifacilitator.ai/compare/aifacilitator-vs-miro',
  datePublished: '2026-05-07',
  dateModified: '2026-05-07',
};

const SCHEMA_FAQ = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is the difference between AIfacilitator and Miro?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Miro is a visual collaboration whiteboard that provides a canvas for teams to work on together. AIfacilitator is an active AI facilitator that guides teams through structured workshop exercises in real time, capturing responses and generating insights automatically. Miro provides the space; AIfacilitator provides the facilitation.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is AIfacilitator a Miro alternative?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'AIfacilitator is a complementary tool to Miro rather than a direct replacement. Miro excels at visual collaboration and whiteboarding. AIfacilitator excels at structured facilitation, anonymous feedback, and automatic session summaries. Many teams use both together: Miro for visual work and AIfacilitator for facilitated discussions.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can AIfacilitator replace Miro for design sprints?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'For the facilitation component of a design sprint, yes. AIfacilitator actively guides teams through each sprint phase, manages time, and captures decisions. However, if your sprint requires visual prototyping or sticky-note mapping on a shared canvas, you may still want to use Miro alongside AIfacilitator.',
      },
    },
    {
      '@type': 'Question',
      name: 'How does AIfacilitator pricing compare to Miro?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'AIfacilitator offers a free plan and paid plans starting at $19/month per workspace. Miro offers a free plan and paid plans starting at approximately $10/user/month. For small teams, AIfacilitator is often more cost-effective for facilitation-focused use cases.',
      },
    },
  ],
};

type FeatureStatus = 'yes' | 'no' | 'partial';

interface Feature {
  feature: string;
  aifacilitator: FeatureStatus;
  miro: FeatureStatus;
  note?: string;
}

const features: Feature[] = [
  { feature: 'AI-powered live facilitation', aifacilitator: 'yes', miro: 'partial', note: 'Miro has AI features but not active facilitation' },
  { feature: 'Visual whiteboard / canvas', aifacilitator: 'no', miro: 'yes', note: 'AIfacilitator is conversation-based, not visual' },
  { feature: 'Participant joins without account', aifacilitator: 'yes', miro: 'partial', note: 'Miro requires account for editing' },
  { feature: 'Automatic session summary', aifacilitator: 'yes', miro: 'no' },
  { feature: 'Anonymous participant responses', aifacilitator: 'yes', miro: 'no' },
  { feature: 'Design sprint support', aifacilitator: 'yes', miro: 'yes', note: 'Miro has templates; AIfacilitator actively facilitates' },
  { feature: 'Retrospective support', aifacilitator: 'yes', miro: 'yes', note: 'Miro has templates; AIfacilitator actively facilitates' },
  { feature: 'Strategic planning support', aifacilitator: 'yes', miro: 'partial' },
  { feature: 'Session analytics & insights', aifacilitator: 'yes', miro: 'no' },
  { feature: 'Sticky notes & visual mapping', aifacilitator: 'no', miro: 'yes' },
  { feature: 'Integrations (Jira, Slack, etc.)', aifacilitator: 'partial', miro: 'yes', note: 'Miro has 100+ integrations' },
  { feature: 'Free plan available', aifacilitator: 'yes', miro: 'yes' },
  { feature: 'Starting price (paid)', aifacilitator: 'yes', miro: 'yes', note: 'AIfacilitator from $19/mo · Miro from $10/user/mo' },
  { feature: 'Mobile app', aifacilitator: 'partial', miro: 'yes' },
];

const StatusIcon = ({ status }: { status: FeatureStatus }) => {
  if (status === 'yes') return <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" />;
  if (status === 'no') return <XCircle className="h-5 w-5 text-red-400 mx-auto" />;
  return <Minus className="h-5 w-5 text-amber-400 mx-auto" />;
};

const VsMiro = () => {
  return (
    <div className="min-h-screen bg-white">
      <PageHead
        title="AIfacilitator vs Miro — Workshop Facilitation Comparison 2026"
        description="AIfacilitator vs Miro: which tool runs better workshops? A detailed comparison of AI-powered facilitation vs visual whiteboard collaboration — features, pricing, and use cases."
        canonical="https://aifacilitator.ai/compare/aifacilitator-vs-miro"
        breadcrumbs={[
          { name: 'Compare', item: 'https://aifacilitator.ai/compare' },
          { name: 'AIfacilitator vs Miro', item: 'https://aifacilitator.ai/compare/aifacilitator-vs-miro' },
        ]}
        jsonLd={[SCHEMA, SCHEMA_FAQ]}
      />

      {/* Hero */}
      <section className="pt-28 pb-16 px-4 bg-gradient-to-br from-gray-50 via-white to-violet-50">
        <div className="container mx-auto max-w-4xl text-center">
          <span className="inline-block mb-5 px-4 py-1.5 rounded-full bg-violet-100 text-violet-700 text-sm font-semibold border border-violet-200">
            Tool Comparison · 2026
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-6 leading-tight">
            AIfacilitator vs Miro
          </h1>
          <p className="text-lg md:text-xl text-gray-500 mb-8 max-w-2xl mx-auto leading-relaxed">
            Miro is the world's leading visual collaboration platform. AIfacilitator is an AI-powered workshop facilitation tool. They are not competitors — they solve different problems. Here is how to decide which one you need.
          </p>
        </div>
      </section>

      {/* TL;DR */}
      <section className="py-12 px-4 bg-white">
        <div className="container mx-auto max-w-4xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-indigo-900 mb-3">Choose AIfacilitator if…</h2>
              <ul className="space-y-2 text-sm text-indigo-800">
                {[
                  'You want an AI to actively guide your team through exercises',
                  'You need automatic session summaries and action items',
                  'You want anonymous, equal participation from all team members',
                  'You run structured sessions like retrospectives or design sprints',
                  'You want facilitation without a dedicated facilitator',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-3">Choose Miro if…</h2>
              <ul className="space-y-2 text-sm text-gray-700">
                {[
                  'You need a visual canvas for sticky notes and diagrams',
                  'You want a flexible, open-ended collaboration space',
                  'You need deep integrations with tools like Jira or Confluence',
                  'Your team works heavily with visual artefacts and mind maps',
                  'You need a persistent workspace that evolves over time',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-gray-500 flex-shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Key Difference */}
      <section className="py-12 px-4 bg-gray-50">
        <div className="container mx-auto max-w-3xl">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 text-center">
            Facilitation vs Collaboration
          </h2>
          <p className="text-gray-600 text-lg leading-relaxed mb-5">
            <strong>Miro is a visual collaboration platform.</strong> It provides an infinite canvas where teams can place sticky notes, draw diagrams, and collaborate visually. It is a powerful tool for creative, open-ended work — but it does not facilitate. Someone still needs to guide the session.
          </p>
          <p className="text-gray-600 text-lg leading-relaxed mb-5">
            <strong>AIfacilitator is an active facilitation tool.</strong> It does not provide a visual canvas — instead, it takes the role of the facilitator, guiding participants through structured exercises, managing time, and synthesising outcomes. The AI asks the right questions at the right time.
          </p>
          <p className="text-gray-600 text-lg leading-relaxed">
            Many teams use Miro and AIfacilitator together: AIfacilitator runs the facilitated conversation, and Miro captures the visual outputs. This combination delivers the best of both worlds.
          </p>
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="py-16 px-4 bg-white">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8 text-center">
            Feature-by-Feature Comparison
          </h2>
          <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left py-4 px-6 font-semibold text-gray-700 w-1/2">Feature</th>
                  <th className="text-center py-4 px-4 font-semibold text-indigo-700 w-1/4">AIfacilitator</th>
                  <th className="text-center py-4 px-4 font-semibold text-gray-600 w-1/4">Miro</th>
                </tr>
              </thead>
              <tbody>
                {features.map((row, i) => (
                  <tr key={row.feature} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                    <td className="py-3 px-6 text-gray-700">
                      {row.feature}
                      {row.note && <span className="block text-xs text-gray-400 mt-0.5">{row.note}</span>}
                    </td>
                    <td className="py-3 px-4 text-center"><StatusIcon status={row.aifacilitator} /></td>
                    <td className="py-3 px-4 text-center"><StatusIcon status={row.miro} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 mt-3 text-center">
            ✓ Available · ✗ Not available · — Partial / Limited. Data as of May 2026.
          </p>
        </div>
      </section>

      {/* Verdict */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="container mx-auto max-w-3xl">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 text-center">Our Verdict</h2>
          <p className="text-gray-600 text-lg leading-relaxed mb-5">
            Miro is the right choice if your team needs a flexible visual workspace for creative collaboration, diagramming, and persistent project documentation. It is one of the best tools in its category and has earned its market-leading position.
          </p>
          <p className="text-gray-600 text-lg leading-relaxed mb-5">
            AIfacilitator is the right choice if your primary challenge is running structured, outcome-driven sessions without a dedicated facilitator. It excels at retrospectives, design sprints, and strategic planning — delivering consistent, high-quality facilitation at a fraction of the cost of a human facilitator.
          </p>
          <p className="text-gray-600 text-lg leading-relaxed">
            The best teams use both. Use AIfacilitator to run the session and generate insights. Use Miro to capture the visual outputs and maintain a persistent workspace.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-gradient-to-br from-indigo-600 to-violet-700">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Try AIfacilitator for free</h2>
          <p className="text-indigo-200 text-lg mb-8">No credit card required. Free plan available.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/signup">
              <Button size="lg" className="text-base font-semibold px-10 py-6 bg-white text-indigo-700 hover:bg-indigo-50 rounded-xl shadow-xl">
                Get Started Free <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/compare/aifacilitator-vs-sessionlab">
              <Button size="lg" className="text-base font-semibold px-10 py-6 bg-transparent border-2 border-white/50 text-white hover:bg-white/10 rounded-xl">
                Compare vs SessionLab →
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default VsMiro;
