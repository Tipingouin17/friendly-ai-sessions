/**
 * Use Case: Agile Retrospective
 * SEO target: "AI retrospective facilitator", "agile retrospective AI tool"
 */
import React from 'react';
import { Link } from 'react-router-dom';
import PageHead from '@/components/PageHead';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ArrowRight, Zap, RefreshCw, MessageSquare, TrendingUp, Shield, Clock } from 'lucide-react';

const SCHEMA_ARTICLE = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'How to Run Better Agile Retrospectives with AI Facilitation',
  description:
    'A practical guide to running more effective agile retrospectives using AIfacilitator. Learn how AI facilitation improves psychological safety, ensures equal participation, and generates actionable insights automatically.',
  author: { '@type': 'Organization', name: 'AIfacilitator', url: 'https://aifacilitator.ai' },
  publisher: {
    '@type': 'Organization',
    name: 'AIfacilitator',
    logo: { '@type': 'ImageObject', url: 'https://aifacilitator.ai/apple-touch-icon.png' },
  },
  url: 'https://aifacilitator.ai/use-cases/retrospective',
  datePublished: '2026-05-07',
  dateModified: '2026-05-07',
};

const SCHEMA_FAQ = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is an AI retrospective facilitator?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'An AI retrospective facilitator is an AI system that guides agile teams through retrospective sessions — asking structured questions, collecting responses anonymously, synthesising themes, and generating action items — without needing a human Scrum Master or agile coach to run the session.',
      },
    },
    {
      '@type': 'Question',
      name: 'How does AIfacilitator improve retrospectives?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'AIfacilitator improves retrospectives by ensuring equal participation, increasing psychological safety through anonymous input, automatically clustering themes and insights, and generating a structured action plan at the end of every session.',
      },
    },
    {
      '@type': 'Question',
      name: 'What retrospective formats does AIfacilitator support?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'AIfacilitator supports all major retrospective formats including Start/Stop/Continue, 4Ls (Liked, Learned, Lacked, Longed For), Mad/Sad/Glad, the Sailboat retrospective, DAKI, and custom formats. The AI adapts the facilitation style to the chosen format.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can AIfacilitator run remote retrospectives?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. AIfacilitator is designed for remote and hybrid teams. All participants join via a shared link with no account required, and the AI facilitates the session in real time.',
      },
    },
  ],
};

const Retrospective = () => {
  return (
    <div className="min-h-screen bg-white">
      <PageHead
        title="AI Agile Retrospective Facilitation — Better Retros, Every Sprint"
        description="Run more effective agile retrospectives with an AI facilitator. AIfacilitator ensures equal participation, psychological safety, and actionable outcomes — automatically. No Scrum Master required."
        canonical="https://aifacilitator.ai/use-cases/retrospective"
        breadcrumbs={[
          { name: 'Use Cases', item: 'https://aifacilitator.ai/use-cases' },
          { name: 'Retrospective', item: 'https://aifacilitator.ai/use-cases/retrospective' },
        ]}
        jsonLd={[SCHEMA_ARTICLE, SCHEMA_FAQ]}
      />

      {/* Hero */}
      <section className="relative pt-28 pb-16 px-4 bg-gradient-to-br from-violet-50 via-white to-indigo-50 overflow-hidden">
        <div className="absolute top-10 left-[10%] w-64 h-64 bg-violet-200/40 rounded-full blur-3xl pointer-events-none" />
        <div className="container mx-auto max-w-4xl text-center">
          <span className="inline-flex items-center gap-2 mb-5 px-4 py-1.5 rounded-full bg-violet-100 text-violet-700 text-sm font-semibold border border-violet-200">
            <RefreshCw className="h-3.5 w-3.5" />
            Use Case · Agile Retrospective
          </span>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 mb-6 leading-tight">
            Better Retrospectives<br />
            <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
              With Every Sprint
            </span>
          </h1>
          <p className="text-lg md:text-xl text-gray-500 mb-8 max-w-2xl mx-auto leading-relaxed">
            Stop running the same retrospective every two weeks and getting the same results. AIfacilitator brings structure, psychological safety, and actionable insights to every retro — automatically.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/signup">
              <Button size="lg" className="text-base font-semibold px-8 py-6 bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 rounded-xl">
                Run Your First AI Retro Free
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

      {/* The Problem */}
      <section className="py-16 md:py-20 px-4 bg-white">
        <div className="container mx-auto max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 text-center">
            Why Most Retrospectives Fail
          </h2>
          <p className="text-gray-600 text-lg leading-relaxed mb-5">
            Research shows that <strong>67% of agile teams</strong> feel their retrospectives are not effective. The most common problems are the same voices dominating the conversation, lack of psychological safety preventing honest feedback, and action items that are never followed up on.
          </p>
          <p className="text-gray-600 text-lg leading-relaxed mb-5">
            A skilled Scrum Master can address these issues — but not every team has one, and even experienced facilitators can struggle to maintain neutrality when they are also a team member.
          </p>
          <p className="text-gray-600 text-lg leading-relaxed">
            <strong>AIfacilitator solves this</strong> by acting as a neutral, consistent facilitator that ensures every voice is heard, captures all feedback anonymously, and generates a structured action plan at the end of every session.
          </p>
        </div>
      </section>

      {/* Retrospective Formats */}
      <section className="py-16 md:py-20 px-4 bg-gray-50">
        <div className="container mx-auto max-w-5xl">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 text-center">
            Retrospective Formats Supported
          </h2>
          <p className="text-gray-500 text-lg text-center mb-12 max-w-2xl mx-auto">
            AIfacilitator supports all major retrospective formats out of the box. Choose the format that fits your team's current needs.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { name: 'Start / Stop / Continue', description: 'The classic retrospective format. The AI guides each participant through what the team should start doing, stop doing, and continue doing.' },
              { name: '4Ls (Liked, Learned, Lacked, Longed For)', description: 'A deeper reflection format that captures both positive and constructive feedback across four dimensions.' },
              { name: 'Mad / Sad / Glad', description: 'An emotion-focused format that creates psychological safety by normalising the full range of team feelings.' },
              { name: 'Sailboat / Speedboat', description: 'A visual metaphor format where the AI guides the team to identify what is propelling them forward and what is holding them back.' },
              { name: 'DAKI (Drop, Add, Keep, Improve)', description: 'An action-oriented format focused on concrete changes the team can make in the next sprint.' },
              { name: 'Custom Format', description: 'Premium and Enterprise plans allow you to define your own retrospective format with custom questions and exercises.' },
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
            How an AI-Facilitated Retrospective Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '1', icon: <Clock className="h-6 w-6 text-indigo-600" />, title: 'Set up in 60 seconds', description: 'Choose your retrospective format, set the sprint context, and share the link with your team. No preparation required.' },
              { step: '2', icon: <MessageSquare className="h-6 w-6 text-indigo-600" />, title: 'AI guides the session', description: 'The AI facilitator leads each exercise, ensures equal participation, and captures all responses — including anonymous feedback.' },
              { step: '3', icon: <TrendingUp className="h-6 w-6 text-indigo-600" />, title: 'Get actionable insights', description: 'At the end of the session, the AI generates a structured report with key themes, voted action items, and owners.' },
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

      {/* Benefits */}
      <section className="py-16 md:py-20 px-4 bg-gray-50">
        <div className="container mx-auto max-w-5xl">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-12 text-center">
            What Teams Gain with AI Retrospectives
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { icon: <Shield className="h-5 w-5 text-indigo-600" />, title: 'Psychological safety', description: 'The AI\'s neutrality encourages honest feedback. Anonymous response options ensure even the quietest team members contribute.' },
              { icon: <CheckCircle2 className="h-5 w-5 text-indigo-600" />, title: 'Equal participation', description: 'The AI ensures every participant has equal time and space to contribute — preventing the loudest voices from dominating.' },
              { icon: <TrendingUp className="h-5 w-5 text-indigo-600" />, title: 'Measurable improvement', description: 'Track retrospective metrics over time. See which action items were completed and how team sentiment evolves sprint over sprint.' },
              { icon: <Clock className="h-5 w-5 text-indigo-600" />, title: 'Time efficiency', description: 'A well-facilitated AI retrospective takes 45–60 minutes. No more 2-hour meetings that drift off topic.' },
              { icon: <Zap className="h-5 w-5 text-indigo-600" />, title: 'Automatic action items', description: 'The AI synthesises feedback into clear, prioritised action items with suggested owners — ready to add to your backlog.' },
              { icon: <RefreshCw className="h-5 w-5 text-indigo-600" />, title: 'Consistent across sprints', description: 'Every retrospective follows the same high-quality facilitation process, making it easy to compare results across sprints.' },
            ].map(b => (
              <div key={b.title} className="flex gap-4">
                <div className="flex-shrink-0 mt-1">{b.icon}</div>
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
              { q: 'How long does an AI-facilitated retrospective take?', a: 'A typical AI-facilitated retrospective takes 45–60 minutes for a team of 5–10 people. The AI manages time boxes automatically, so sessions rarely run over.' },
              { q: 'Can participants submit feedback anonymously?', a: 'Yes. AIfacilitator supports anonymous response modes, which significantly increases the quality and honesty of feedback — especially for sensitive topics.' },
              { q: 'Does AIfacilitator integrate with Jira or Linear?', a: 'Direct integrations are on the roadmap. Currently, the AI generates a structured action item report that can be exported and imported into your project management tool.' },
              { q: 'Can I run retrospectives for remote teams?', a: 'Absolutely. AIfacilitator is built for remote and hybrid teams. Participants join from anywhere via a browser link — no downloads or accounts required.' },
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
      <section className="py-16 md:py-20 px-4 bg-gradient-to-br from-violet-600 to-indigo-700">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Run a better retrospective this sprint.
          </h2>
          <p className="text-violet-200 text-lg mb-8 max-w-xl mx-auto">
            Free plan available. No credit card required. Set up in 60 seconds.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/signup">
              <Button size="lg" className="text-base font-semibold px-10 py-6 bg-white text-violet-700 hover:bg-violet-50 rounded-xl shadow-xl">
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/use-cases/strategic-planning">
              <Button size="lg" className="text-base font-semibold px-10 py-6 bg-transparent border-2 border-white/50 text-white hover:bg-white/10 rounded-xl">
                Explore Strategic Planning →
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Retrospective;
