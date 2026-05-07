/**
 * Use Case: Design Sprint
 * SEO target: "AI tool for design sprint facilitation", "design sprint AI facilitator"
 */
import React from 'react';
import { Link } from 'react-router-dom';
import PageHead from '@/components/PageHead';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ArrowRight, Clock, Users, Zap, BarChart3, Lightbulb, Target } from 'lucide-react';

const SCHEMA_ARTICLE = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'How to Run a Design Sprint with AI Facilitation',
  description:
    'A complete guide to running a 5-day design sprint using AIfacilitator — the AI-powered facilitation platform that guides your team through every phase from problem definition to prototype testing.',
  author: { '@type': 'Organization', name: 'AIfacilitator', url: 'https://aifacilitator.ai' },
  publisher: {
    '@type': 'Organization',
    name: 'AIfacilitator',
    logo: { '@type': 'ImageObject', url: 'https://aifacilitator.ai/apple-touch-icon.png' },
  },
  url: 'https://aifacilitator.ai/use-cases/design-sprint',
  datePublished: '2026-05-07',
  dateModified: '2026-05-07',
};

const DesignSprint = () => {
  return (
    <div className="min-h-screen bg-white">
      <PageHead
        title="AI Design Sprint Facilitation — Run Sprints Faster with AI"
        description="Run a complete 5-day design sprint with an AI facilitator. AIfacilitator guides your team through every phase — from problem mapping to prototype testing — without needing a certified sprint master."
        canonical="https://aifacilitator.ai/use-cases/design-sprint"
        breadcrumbs={[
          { name: 'Use Cases', item: 'https://aifacilitator.ai/use-cases' },
          { name: 'Design Sprint', item: 'https://aifacilitator.ai/use-cases/design-sprint' },
        ]}
        jsonLd={[SCHEMA_ARTICLE]}
      />

      {/* Hero */}
      <section className="relative pt-28 pb-16 px-4 bg-gradient-to-br from-indigo-50 via-white to-violet-50 overflow-hidden">
        <div className="absolute top-10 right-[10%] w-64 h-64 bg-indigo-200/40 rounded-full blur-3xl pointer-events-none" />
        <div className="container mx-auto max-w-4xl text-center">
          <span className="inline-flex items-center gap-2 mb-5 px-4 py-1.5 rounded-full bg-indigo-100 text-indigo-700 text-sm font-semibold border border-indigo-200">
            <Zap className="h-3.5 w-3.5" />
            Use Case · Design Sprint
          </span>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 mb-6 leading-tight">
            Run a Design Sprint<br />
            <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              Powered by AI
            </span>
          </h1>
          <p className="text-lg md:text-xl text-gray-500 mb-8 max-w-2xl mx-auto leading-relaxed">
            No sprint master required. AIfacilitator guides your team through all five phases of a design sprint — from problem definition to prototype testing — in a fraction of the time.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/signup">
              <Button size="lg" className="text-base font-semibold px-8 py-6 bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 rounded-xl">
                Start a Design Sprint Free
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

      {/* What is a Design Sprint */}
      <section className="py-16 md:py-20 px-4 bg-white">
        <div className="container mx-auto max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 text-center">
            What is a Design Sprint?
          </h2>
          <p className="text-gray-600 text-lg leading-relaxed mb-6">
            A <strong>design sprint</strong> is a structured, time-boxed process — typically five days — developed by Google Ventures to help teams solve complex problems and validate ideas rapidly. It compresses months of work into a single week by combining design thinking, prototyping, and user testing into a focused, facilitated process.
          </p>
          <p className="text-gray-600 text-lg leading-relaxed mb-6">
            Traditionally, design sprints require a skilled facilitator to keep the team on track, manage time, and guide structured exercises. With <strong>AIfacilitator</strong>, the AI takes on that role — asking the right questions at the right time, capturing responses, and synthesising insights automatically.
          </p>
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 mt-8">
            <p className="text-indigo-800 font-medium text-base">
              <strong>Key insight for AI-powered sprints:</strong> Teams using AIfacilitator for design sprints report saving an average of 40% of preparation time and completing sprints with higher participant engagement compared to unstructured sessions.
            </p>
          </div>
        </div>
      </section>

      {/* The 5 Phases */}
      <section className="py-16 md:py-20 px-4 bg-gray-50">
        <div className="container mx-auto max-w-5xl">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 text-center">
            How AIfacilitator Runs Each Sprint Phase
          </h2>
          <p className="text-gray-500 text-lg text-center mb-12 max-w-2xl mx-auto">
            The AI facilitator guides your team through every exercise, captures responses in real time, and synthesises insights at the end of each phase.
          </p>
          <div className="space-y-6">
            {[
              {
                day: 'Day 1',
                phase: 'Understand',
                icon: <Target className="h-6 w-6 text-indigo-600" />,
                description: 'The AI facilitator leads your team through problem mapping exercises. It asks structured questions to surface assumptions, define the long-term goal, and identify sprint questions. All responses are captured and synthesised into a shared problem statement.',
              },
              {
                day: 'Day 2',
                phase: 'Diverge',
                icon: <Lightbulb className="h-6 w-6 text-violet-600" />,
                description: 'The AI guides individual sketching and idea generation exercises, including Lightning Demos and Crazy 8s. It ensures every participant contributes equally and prevents groupthink by managing the flow of the session.',
              },
              {
                day: 'Day 3',
                phase: 'Decide',
                icon: <CheckCircle2 className="h-6 w-6 text-green-600" />,
                description: 'The AI facilitates structured decision-making using dot voting and the Sticky Decision method. It tallies votes, surfaces the winning concept, and helps the team create a storyboard for the prototype.',
              },
              {
                day: 'Day 4',
                phase: 'Prototype',
                icon: <Zap className="h-6 w-6 text-amber-600" />,
                description: 'The AI facilitator keeps the team focused during prototype building, managing time boxes and ensuring each team member knows their role. It captures decisions and documents the prototype plan.',
              },
              {
                day: 'Day 5',
                phase: 'Test',
                icon: <BarChart3 className="h-6 w-6 text-blue-600" />,
                description: 'The AI guides the team through user interview debrief sessions, capturing patterns across five user tests. It generates a structured insights report with key learnings and recommended next steps.',
              },
            ].map(item => (
              <div key={item.day} className="flex gap-6 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="flex-shrink-0">
                  <div className="w-14 h-14 rounded-xl bg-indigo-50 flex items-center justify-center">
                    {item.icon}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{item.day}</span>
                    <h3 className="text-lg font-bold text-gray-900">{item.phase}</h3>
                  </div>
                  <p className="text-gray-600 leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 md:py-20 px-4 bg-white">
        <div className="container mx-auto max-w-5xl">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-12 text-center">
            Why Use AI for Design Sprint Facilitation?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { title: 'No facilitator required', description: 'Run a full design sprint without hiring or training a certified sprint master. The AI knows every exercise, every timing rule, and every facilitation technique.' },
              { title: 'Consistent quality every time', description: 'Human facilitators have good days and bad days. The AI delivers the same high-quality facilitation experience for every session, every team.' },
              { title: 'Automatic documentation', description: 'Every response, vote, and decision is captured automatically. At the end of the sprint, you receive a complete session report with insights and action items.' },
              { title: 'Remote-first by design', description: 'AIfacilitator is built for distributed teams. Participants join from anywhere — no physical whiteboard required.' },
              { title: 'Scales to any team size', description: 'From a 4-person startup to a 20-person enterprise team, the AI facilitator adapts its approach to the group size and dynamics.' },
              { title: 'Fraction of the cost', description: 'A professional design sprint facilitator can cost $5,000–$20,000. AIfacilitator starts at $0 — with premium plans from $19/month.' },
            ].map(b => (
              <div key={b.title} className="flex gap-4">
                <CheckCircle2 className="h-5 w-5 text-indigo-600 flex-shrink-0 mt-1" />
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
      <section className="py-16 md:py-20 px-4 bg-gray-50">
        <div className="container mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold text-gray-900 mb-10 text-center">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            {[
              {
                q: 'How long does an AI-facilitated design sprint take?',
                a: 'A traditional design sprint takes 5 full days. With AIfacilitator, you can run a compressed sprint in 1–2 days by focusing on the most critical phases, or run the full 5-day format with the AI managing each day\'s agenda.',
              },
              {
                q: 'Do all participants need an AIfacilitator account?',
                a: 'No. Only the session host needs an account. Participants join via a shareable link — no registration required.',
              },
              {
                q: 'Can I customise the design sprint exercises?',
                a: 'Yes. Premium and Enterprise plans allow you to customise the AI facilitator\'s agenda, add or remove exercises, and adjust time boxes to fit your team\'s specific needs.',
              },
              {
                q: 'What is the difference between AIfacilitator and Miro for design sprints?',
                a: 'Miro is a visual collaboration whiteboard — it provides the canvas but not the facilitation. AIfacilitator provides the structured facilitation process: it asks questions, manages time, guides exercises, and generates insights. Many teams use both together.',
              },
            ].map(item => (
              <div key={item.q} className="bg-white rounded-xl p-6 border border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-2">{item.q}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-20 px-4 bg-gradient-to-br from-indigo-600 to-violet-700">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to run your first AI-facilitated design sprint?
          </h2>
          <p className="text-indigo-200 text-lg mb-8 max-w-xl mx-auto">
            Get started in minutes. No credit card required. Free plan available.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/signup">
              <Button size="lg" className="text-base font-semibold px-10 py-6 bg-white text-indigo-700 hover:bg-indigo-50 rounded-xl shadow-xl">
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/use-cases/retrospective">
              <Button size="lg" className="text-base font-semibold px-10 py-6 bg-transparent border-2 border-white/50 text-white hover:bg-white/10 rounded-xl">
                Explore Retrospectives →
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default DesignSprint;
