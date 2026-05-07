/**
 * Use Case: Strategic Planning
 * SEO target: "AI strategic planning workshop", "AI facilitated strategy session"
 */
import React from 'react';
import { Link } from 'react-router-dom';
import PageHead from '@/components/PageHead';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ArrowRight, Target, BarChart3, Users, Lightbulb, Zap, Globe } from 'lucide-react';

const SCHEMA_ARTICLE = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'How to Run an AI-Facilitated Strategic Planning Workshop',
  description:
    'A complete guide to running effective strategic planning sessions with AI facilitation. AIfacilitator guides leadership teams through SWOT analysis, OKR setting, and strategic prioritisation — delivering a clear, aligned strategy in a single session.',
  author: { '@type': 'Organization', name: 'AIfacilitator', url: 'https://aifacilitator.ai' },
  publisher: {
    '@type': 'Organization',
    name: 'AIfacilitator',
    logo: { '@type': 'ImageObject', url: 'https://aifacilitator.ai/apple-touch-icon.png' },
  },
  url: 'https://aifacilitator.ai/use-cases/strategic-planning',
  datePublished: '2026-05-07',
  dateModified: '2026-05-07',
};

const StrategicPlanning = () => {
  return (
    <div className="min-h-screen bg-white">
      <PageHead
        title="AI Strategic Planning Workshop Facilitation — Align Your Team Faster"
        description="Run effective strategic planning sessions with an AI facilitator. AIfacilitator guides leadership teams through SWOT analysis, OKR setting, and strategic prioritisation — delivering a clear, aligned strategy in a single session."
        canonical="https://aifacilitator.ai/use-cases/strategic-planning"
        breadcrumbs={[
          { name: 'Use Cases', item: 'https://aifacilitator.ai/use-cases' },
          { name: 'Strategic Planning', item: 'https://aifacilitator.ai/use-cases/strategic-planning' },
        ]}
        jsonLd={[SCHEMA_ARTICLE]}
      />

      {/* Hero */}
      <section className="relative pt-28 pb-16 px-4 bg-gradient-to-br from-blue-50 via-white to-indigo-50 overflow-hidden">
        <div className="absolute bottom-0 right-[5%] w-72 h-72 bg-blue-200/30 rounded-full blur-3xl pointer-events-none" />
        <div className="container mx-auto max-w-4xl text-center">
          <span className="inline-flex items-center gap-2 mb-5 px-4 py-1.5 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold border border-blue-200">
            <Target className="h-3.5 w-3.5" />
            Use Case · Strategic Planning
          </span>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 mb-6 leading-tight">
            Strategic Planning<br />
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Aligned in One Session
            </span>
          </h1>
          <p className="text-lg md:text-xl text-gray-500 mb-8 max-w-2xl mx-auto leading-relaxed">
            Stop spending weeks on strategy documents that nobody reads. AIfacilitator guides your leadership team through a structured strategic planning session — from SWOT to OKRs — in a single, focused workshop.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/signup">
              <Button size="lg" className="text-base font-semibold px-8 py-6 bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 rounded-xl">
                Start a Strategy Session Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/pricing">
              <Button size="lg" variant="outline" className="text-base font-semibold px-8 py-6 border-2 border-gray-200 hover:border-indigo-300 hover:text-indigo-600 rounded-xl">
                View Pricing
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* The Challenge */}
      <section className="py-16 md:py-20 px-4 bg-white">
        <div className="container mx-auto max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 text-center">
            The Strategic Planning Problem
          </h2>
          <p className="text-gray-600 text-lg leading-relaxed mb-5">
            Traditional strategic planning is broken. Leadership teams spend days in off-site workshops, consultants charge tens of thousands of dollars, and the resulting strategy documents are often outdated by the time they are published.
          </p>
          <p className="text-gray-600 text-lg leading-relaxed mb-5">
            The core problem is not the strategy itself — it is the <strong>facilitation process</strong>. Without a skilled facilitator, strategic sessions devolve into debates dominated by the most senior voices, with junior team members' insights left uncaptured.
          </p>
          <p className="text-gray-600 text-lg leading-relaxed">
            AIfacilitator brings the rigour of a professional strategy consultant to every session — ensuring all voices are heard, all frameworks are applied correctly, and all decisions are documented in real time.
          </p>
        </div>
      </section>

      {/* Frameworks */}
      <section className="py-16 md:py-20 px-4 bg-gray-50">
        <div className="container mx-auto max-w-5xl">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 text-center">
            Strategic Frameworks Supported
          </h2>
          <p className="text-gray-500 text-lg text-center mb-12 max-w-2xl mx-auto">
            AIfacilitator guides your team through proven strategic frameworks — no consultant required.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { name: 'SWOT Analysis', description: 'The AI guides a structured SWOT session, ensuring balanced coverage of Strengths, Weaknesses, Opportunities, and Threats with equal input from all participants.' },
              { name: 'OKR Setting', description: 'Facilitate a collaborative OKR-setting session where the AI helps the team define ambitious Objectives and measurable Key Results aligned to company strategy.' },
              { name: 'PESTLE Analysis', description: 'Guide the team through a systematic analysis of Political, Economic, Social, Technological, Legal, and Environmental factors affecting the business.' },
              { name: 'Porter\'s Five Forces', description: 'The AI facilitates a structured competitive analysis using Porter\'s Five Forces framework, helping the team understand their competitive position.' },
              { name: 'Strategic Prioritisation', description: 'Use the AI to facilitate an Impact/Effort matrix session, helping the team prioritise strategic initiatives based on collective assessment.' },
              { name: 'Vision & Mission Workshop', description: 'Guide the leadership team through a structured process to define or refine the company\'s vision, mission, and core values.' },
            ].map(f => (
              <div key={f.name} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-2">{f.name}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 md:py-20 px-4 bg-white">
        <div className="container mx-auto max-w-5xl">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-12 text-center">
            A Typical AI-Facilitated Strategy Session
          </h2>
          <div className="space-y-6">
            {[
              { phase: 'Opening (15 min)', icon: <Users className="h-5 w-5 text-blue-600" />, description: 'The AI facilitator opens the session with a structured check-in, establishes ground rules, and sets the strategic context. It ensures every participant understands the session objectives.' },
              { phase: 'Context Setting (20 min)', icon: <Globe className="h-5 w-5 text-indigo-600" />, description: 'The AI guides the team through a rapid environmental scan, asking structured questions about market trends, competitive dynamics, and internal capabilities.' },
              { phase: 'Framework Application (60–90 min)', icon: <BarChart3 className="h-5 w-5 text-violet-600" />, description: 'The core of the session. The AI facilitates the chosen strategic framework (e.g., SWOT, OKRs), managing time boxes, ensuring equal participation, and capturing all inputs in real time.' },
              { phase: 'Prioritisation (30 min)', icon: <Target className="h-5 w-5 text-green-600" />, description: 'The AI facilitates a structured prioritisation exercise, helping the team converge on the most important strategic priorities using dot voting and structured criteria.' },
              { phase: 'Action Planning (20 min)', icon: <Lightbulb className="h-5 w-5 text-amber-600" />, description: 'The AI guides the team to define specific next steps, owners, and timelines for each strategic priority. The session concludes with a shared action plan.' },
              { phase: 'Session Report (automatic)', icon: <Zap className="h-5 w-5 text-indigo-600" />, description: 'Immediately after the session, the AI generates a comprehensive strategy document including all captured insights, decisions, priorities, and action items — ready to share with the broader organisation.' },
            ].map(item => (
              <div key={item.phase} className="flex gap-6 bg-gray-50 rounded-2xl p-6 border border-gray-100">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-xl bg-white border border-gray-100 flex items-center justify-center shadow-sm">
                    {item.icon}
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">{item.phase}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 md:py-20 px-4 bg-gray-50">
        <div className="container mx-auto max-w-5xl">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-12 text-center">
            Why Leadership Teams Choose AIfacilitator
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { title: 'Democratise strategic input', description: 'Every team member — from the CEO to the newest hire — has equal opportunity to contribute. The AI ensures no voice is drowned out.' },
              { title: 'Eliminate facilitation bias', description: 'A neutral AI facilitator has no stake in the outcome. It applies frameworks objectively and does not favour any particular strategic direction.' },
              { title: 'Real-time documentation', description: 'Every insight, decision, and action item is captured automatically. No more post-session scramble to reconstruct what was decided.' },
              { title: 'Fraction of the cost', description: 'Strategy consultants charge $10,000–$50,000 for facilitated strategy sessions. AIfacilitator delivers comparable facilitation quality starting at $0.' },
              { title: 'Repeatable process', description: 'Run quarterly strategy reviews with the same high-quality facilitation process every time. Track how your strategy evolves over time.' },
              { title: 'Remote leadership teams', description: 'Bring geographically distributed leadership teams together for effective strategy sessions — no travel required.' },
            ].map(b => (
              <div key={b.title} className="flex gap-4">
                <CheckCircle2 className="h-5 w-5 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{b.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{b.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 md:py-20 px-4 bg-white">
        <div className="container mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold text-gray-900 mb-10 text-center">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            {[
              { q: 'How long does an AI-facilitated strategy session take?', a: 'A focused AI-facilitated strategy session typically takes 2–3 hours. For more comprehensive annual planning, sessions can be structured over a full day or across multiple shorter sessions.' },
              { q: 'How many people can participate in a strategy session?', a: 'AIfacilitator works best with groups of 4–20 participants. For larger groups, the AI can facilitate breakout sessions and then synthesise insights across groups.' },
              { q: 'Can I use AIfacilitator for board-level strategy sessions?', a: 'Yes. The Premium and Enterprise plans include facilitator personas specifically designed for senior leadership and board-level sessions, with appropriate tone, depth, and confidentiality controls.' },
              { q: 'How does AIfacilitator compare to hiring a strategy consultant?', a: 'A strategy consultant brings deep industry expertise and external perspective — AIfacilitator does not replace that. However, for the facilitation process itself (running the session, capturing insights, generating documentation), AIfacilitator delivers comparable quality at a fraction of the cost.' },
            ].map(item => (
              <div key={item.q} className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-2">{item.q}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-20 px-4 bg-gradient-to-br from-blue-600 to-indigo-700">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Align your team around a clear strategy — today.
          </h2>
          <p className="text-blue-200 text-lg mb-8 max-w-xl mx-auto">
            Free plan available. No credit card required. Set up in 60 seconds.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/signup">
              <Button size="lg" className="text-base font-semibold px-10 py-6 bg-white text-blue-700 hover:bg-blue-50 rounded-xl shadow-xl">
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/use-cases/design-sprint">
              <Button size="lg" className="text-base font-semibold px-10 py-6 bg-transparent border-2 border-white/50 text-white hover:bg-white/10 rounded-xl">
                Explore Design Sprints →
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default StrategicPlanning;
