/**
 * Comparison: AIfacilitator vs SessionLab
 * SEO target: "AIfacilitator vs SessionLab", "SessionLab alternative"
 */
import React from 'react';
import { Link } from 'react-router-dom';
import PageHead from '@/components/PageHead';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, ArrowRight, Minus } from 'lucide-react';

const SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'AIfacilitator vs SessionLab: Which Workshop Tool is Right for You?',
  description:
    'A detailed comparison of AIfacilitator and SessionLab. Understand the key differences in AI facilitation, pricing, features, and use cases to choose the right workshop tool for your team.',
  author: { '@type': 'Organization', name: 'AIfacilitator', url: 'https://aifacilitator.ai' },
  publisher: {
    '@type': 'Organization',
    name: 'AIfacilitator',
    logo: { '@type': 'ImageObject', url: 'https://aifacilitator.ai/apple-touch-icon.png' },
  },
  url: 'https://aifacilitator.ai/compare/aifacilitator-vs-sessionlab',
  datePublished: '2026-05-07',
  dateModified: '2026-05-14',
};

const SCHEMA_FAQ = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is the main difference between AIfacilitator and SessionLab?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'SessionLab is a workshop planning and agenda-building tool — it helps facilitators design sessions in advance. AIfacilitator is an active AI facilitator that runs the session in real time, guiding participants through exercises, capturing responses, and generating insights automatically.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is AIfacilitator a good SessionLab alternative?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes, for teams that want live AI facilitation rather than just agenda planning. AIfacilitator adds real-time AI guidance, anonymous participant responses, automatic session summaries, and post-session analytics — features that SessionLab does not offer.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I use AIfacilitator and SessionLab together?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Many facilitators use SessionLab to plan and design their workshop agenda, then use AIfacilitator to run the live session. The two tools complement each other well.',
      },
    },
    {
      '@type': 'Question',
      name: 'How does AIfacilitator pricing compare to SessionLab?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Both tools offer a free plan. AIfacilitator paid plans start at €19/month and SessionLab paid plans start at approximately $20/month. AIfacilitator focuses on live AI facilitation and session analytics, while SessionLab focuses on agenda planning and a method library.',
      },
    },
  ],
};

type FeatureStatus = 'yes' | 'no' | 'partial';

interface Feature {
  feature: string;
  aifacilitator: FeatureStatus;
  sessionlab: FeatureStatus;
  note?: string;
}

const features: Feature[] = [
  { feature: 'AI-powered facilitation (real-time)', aifacilitator: 'yes', sessionlab: 'no', note: 'SessionLab is a planning tool, not a facilitation tool' },
  { feature: 'Workshop agenda builder', aifacilitator: 'partial', sessionlab: 'yes', note: 'SessionLab excels at agenda planning' },
  { feature: 'Live session facilitation', aifacilitator: 'yes', sessionlab: 'no' },
  { feature: 'Participant joins without account', aifacilitator: 'yes', sessionlab: 'no' },
  { feature: 'Automatic session summary / report', aifacilitator: 'yes', sessionlab: 'no' },
  { feature: 'Anonymous participant responses', aifacilitator: 'yes', sessionlab: 'no' },
  { feature: 'Design sprint templates', aifacilitator: 'yes', sessionlab: 'yes' },
  { feature: 'Agile retrospective support', aifacilitator: 'yes', sessionlab: 'partial' },
  { feature: 'Strategic planning frameworks', aifacilitator: 'yes', sessionlab: 'partial' },
  { feature: 'Session analytics & insights', aifacilitator: 'yes', sessionlab: 'no' },
  { feature: 'Free plan available', aifacilitator: 'yes', sessionlab: 'yes' },
  { feature: 'Starting price (paid)', aifacilitator: 'yes', sessionlab: 'yes', note: 'AIfacilitator from €19/mo · SessionLab from $20/mo' },
  { feature: 'Remote team support', aifacilitator: 'yes', sessionlab: 'yes' },
  { feature: 'Library of facilitation methods', aifacilitator: 'partial', sessionlab: 'yes', note: 'SessionLab has a larger method library' },
];

const StatusIcon = ({ status }: { status: FeatureStatus }) => {
  if (status === 'yes') return <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" />;
  if (status === 'no') return <XCircle className="h-5 w-5 text-red-400 mx-auto" />;
  return <Minus className="h-5 w-5 text-amber-400 mx-auto" />;
};

const VsSessionLab = () => {
  return (
    <div className="min-h-screen bg-white">
      <PageHead
        title="AIfacilitator vs SessionLab — Detailed Comparison 2026"
        description="AIfacilitator vs SessionLab: a detailed feature-by-feature comparison. Discover which workshop facilitation tool is right for your team in 2026 — and why AI-powered facilitation is changing the game."
        canonical="https://aifacilitator.ai/compare/aifacilitator-vs-sessionlab"
        breadcrumbs={[
          { name: 'Compare', item: 'https://aifacilitator.ai/compare' },
          { name: 'AIfacilitator vs SessionLab', item: 'https://aifacilitator.ai/compare/aifacilitator-vs-sessionlab' },
        ]}
        jsonLd={[SCHEMA, SCHEMA_FAQ]}
      />

      {/* Hero */}
      <section className="pt-28 pb-16 px-4 bg-gradient-to-br from-gray-50 via-white to-indigo-50">
        <div className="container mx-auto max-w-4xl text-center">
          <span className="inline-block mb-5 px-4 py-1.5 rounded-full bg-indigo-100 text-indigo-700 text-sm font-semibold border border-indigo-200">
            Tool Comparison · 2026
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-6 leading-tight">
            AIfacilitator vs SessionLab
          </h1>
          <p className="text-lg md:text-xl text-gray-500 mb-8 max-w-2xl mx-auto leading-relaxed">
            AIfacilitator is best when you want an AI to run the live workshop, guide participants, capture responses, and generate action items. SessionLab is best when you want to design agendas and plan facilitation methods before the session. Choose AIfacilitator for real-time facilitation; choose SessionLab for workshop planning.
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
                  'You want an AI to actively facilitate your sessions in real time',
                  'You need participants to join without creating accounts',
                  'You want automatic session summaries and action items',
                  'You run retrospectives, design sprints, or strategy sessions regularly',
                  'You need anonymous feedback from participants',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-3">Choose SessionLab if…</h2>
              <ul className="space-y-2 text-sm text-gray-700">
                {[
                  'You primarily need a workshop agenda planning tool',
                  'You want access to a large library of facilitation methods',
                  'You are a professional facilitator who designs complex agendas',
                  'You need to share detailed session plans with clients',
                  'You want to build a personal library of reusable activities',
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
            The Fundamental Difference
          </h2>
          <p className="text-gray-600 text-lg leading-relaxed mb-5">
            <strong>SessionLab is a workshop planning tool.</strong> It helps facilitators design agendas, organise activities, and share session plans. It is excellent at the <em>preparation</em> phase of facilitation.
          </p>
          <p className="text-gray-600 text-lg leading-relaxed mb-5">
            <strong>AIfacilitator is a live facilitation tool.</strong> It takes over during the session itself — guiding participants through exercises, managing time, capturing responses, and generating insights. It focuses on the <em>execution</em> phase.
          </p>
          <p className="text-gray-600 text-lg leading-relaxed">
            Many teams use both: SessionLab to plan the agenda, and AIfacilitator to run the session. However, if you have to choose one, the decision depends on whether your primary challenge is planning or execution.
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
                  <th className="text-center py-4 px-4 font-semibold text-gray-600 w-1/4">SessionLab</th>
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
                    <td className="py-3 px-4 text-center"><StatusIcon status={row.sessionlab} /></td>
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

      {/* Pricing */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8 text-center">Pricing Comparison</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-indigo-100 p-6">
              <h3 className="font-bold text-indigo-700 text-lg mb-4">AIfacilitator</h3>
              <ul className="space-y-3 text-sm text-gray-700">
                <li className="flex justify-between"><span className="font-medium">Free</span><span>€0 / month</span></li>
                <li className="flex justify-between"><span className="font-medium">Starter</span><span>€19 / month</span></li>
                <li className="flex justify-between"><span className="font-medium">Premium</span><span>€49 / month</span></li>
                <li className="flex justify-between"><span className="font-medium">Enterprise</span><span>Custom</span></li>
              </ul>
              <Link to="/pricing" className="block mt-5">
                <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-sm">View AIfacilitator Pricing</Button>
              </Link>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="font-bold text-gray-700 text-lg mb-4">SessionLab</h3>
              <ul className="space-y-3 text-sm text-gray-700">
                <li className="flex justify-between"><span className="font-medium">Free</span><span>€0 / month</span></li>
                <li className="flex justify-between"><span className="font-medium">Pro</span><span>~$20 / month</span></li>
                <li className="flex justify-between"><span className="font-medium">Team</span><span>~$40 / month</span></li>
                <li className="flex justify-between"><span className="font-medium">Enterprise</span><span>Custom</span></li>
              </ul>
              <p className="text-xs text-gray-400 mt-5">Pricing from SessionLab's public website. Verify current pricing at sessionlab.com.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Verdict */}
      <section className="py-16 px-4 bg-white">
        <div className="container mx-auto max-w-3xl">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 text-center">Our Verdict</h2>
          <p className="text-gray-600 text-lg leading-relaxed mb-5">
            SessionLab is the best tool for professional facilitators who spend significant time designing complex workshop agendas and need a rich library of facilitation methods. If your primary job is designing and selling facilitation programmes, SessionLab is purpose-built for you.
          </p>
          <p className="text-gray-600 text-lg leading-relaxed mb-5">
            AIfacilitator is the better choice for teams who want to run structured workshops without a dedicated facilitator. If you are a product manager running design sprints, a Scrum Master running retrospectives, or a leadership team running strategy sessions — AIfacilitator delivers better outcomes with less effort.
          </p>
          <p className="text-gray-600 text-lg leading-relaxed">
            The bottom line: if you need to <em>plan</em> workshops, use SessionLab. If you need to <em>run</em> them, use AIfacilitator.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-gradient-to-br from-indigo-600 to-violet-700">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Try AIfacilitator for free</h2>
          <p className="text-indigo-200 text-lg mb-8">No credit card required. Free plan available.</p>
          <Link to="/signup">
            <Button size="lg" className="text-base font-semibold px-10 py-6 bg-white text-indigo-700 hover:bg-indigo-50 rounded-xl shadow-xl">
              Get Started Free <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default VsSessionLab;
