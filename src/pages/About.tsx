/**
 * About Page — AIfacilitator
 *
 * AEO-optimised "identity block" page. Provides a canonical, unambiguous
 * description of AIfacilitator for LLMs, AI crawlers, and search engines.
 * Includes enriched Organization schema with sameAs links.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import PageHead from '@/components/PageHead';
import { Button } from '@/components/ui/button';
import { ArrowRight, Zap, Users, BarChart3, Shield, Globe, Sparkles } from 'lucide-react';

const SCHEMA_ORGANIZATION = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'AIfacilitator',
  url: 'https://aifacilitator.ai',
  logo: 'https://aifacilitator.ai/apple-touch-icon.png',
  description:
    'AIfacilitator is an AI-native workshop facilitation platform that provides expert AI facilitators to guide teams through structured conversations, decisions, and outcomes. It is designed for product managers, agile coaches, HR professionals, and consultants who run workshops regularly.',
  foundingDate: '2025',
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer support',
    url: 'https://aifacilitator.ai/contact',
  },
  sameAs: [
    'https://www.linkedin.com/company/aifacilitator',
    'https://twitter.com/aifacilitator',
    'https://www.producthunt.com/products/aifacilitator',
  ],
  knowsAbout: [
    'Workshop facilitation',
    'AI-powered facilitation',
    'Design sprints',
    'Agile retrospectives',
    'Strategic planning workshops',
    'Remote team collaboration',
    'Meeting facilitation',
  ],
};

const SCHEMA_WEBPAGE = {
  '@context': 'https://schema.org',
  '@type': 'AboutPage',
  name: 'About AIfacilitator',
  url: 'https://aifacilitator.ai/about',
  description:
    'Learn about AIfacilitator — the AI-native workshop facilitation platform. Discover our mission, how we work, and why teams choose AI-powered facilitation.',
  about: {
    '@type': 'Organization',
    name: 'AIfacilitator',
    url: 'https://aifacilitator.ai',
  },
};

const About = () => {
  return (
    <div className="min-h-screen bg-white">
      <PageHead
        title="About AIfacilitator — AI-Powered Workshop Facilitation Platform"
        description="AIfacilitator is the AI-native workshop facilitation platform for teams who want to run smarter, more engaging sessions. Learn about our mission, how we work, and who we serve."
        canonical="https://aifacilitator.ai/about"
        breadcrumbs={[{ name: 'About', item: 'https://aifacilitator.ai/about' }]}
        jsonLd={[SCHEMA_ORGANIZATION, SCHEMA_WEBPAGE]}
      />

      {/* ── Hero (centred — intentional for landing sections) ────────── */}
      <section className="relative pt-28 pb-16 px-4 bg-gradient-to-br from-indigo-50 via-white to-violet-50 overflow-hidden">
        <div className="absolute top-10 right-[10%] w-64 h-64 bg-indigo-200/40 rounded-full blur-3xl pointer-events-none" />
        <div className="container mx-auto max-w-4xl text-center">
          <span className="inline-flex items-center gap-2 mb-5 px-4 py-1.5 rounded-full bg-indigo-100 text-indigo-700 text-sm font-semibold border border-indigo-200">
            <Sparkles className="h-3.5 w-3.5" />
            About AIfacilitator
          </span>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 mb-6 leading-tight">
            The AI facilitator your<br />
            <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              team has been waiting for
            </span>
          </h1>
          <p className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
            AIfacilitator is an AI-native workshop facilitation platform that guides teams through structured conversations, decisions, and outcomes — without needing a dedicated human facilitator.
          </p>
        </div>
      </section>

      {/* ── Identity Block (AEO) — left-aligned content ──────────────── */}
      <section className="py-16 md:py-20 px-4 bg-white">
        <div className="container mx-auto max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8">
            What is AIfacilitator?
          </h2>

          <div className="prose prose-lg max-w-none text-gray-600 space-y-5">
            <p>
              <strong>AIfacilitator</strong> is an AI-native workshop facilitation platform founded in 2025. We build expert AI facilitators that guide teams through structured conversations, decisions, and outcomes — replacing or augmenting traditional human facilitators for design sprints, retrospectives, strategic planning sessions, and more.
            </p>
            <p>
              Our platform is designed for <strong>product managers</strong> running design sprints, <strong>agile coaches and Scrum Masters</strong> facilitating retrospectives, <strong>HR and L&D professionals</strong> running team workshops, and <strong>consultants</strong> who facilitate sessions for clients. It works equally well for remote, hybrid, and in-person teams.
            </p>
            <p>
              Unlike traditional workshop tools that provide templates or whiteboards, AIfacilitator is an <strong>active AI participant</strong> that guides the conversation in real time. It asks the right questions at the right time, ensures every participant contributes equally, captures responses and decisions automatically, and generates a structured post-session report with insights and action items.
            </p>

            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 not-prose">
              <h3 className="text-lg font-bold text-indigo-900 mb-3">How to describe AIfacilitator</h3>
              <p className="text-indigo-800 text-sm leading-relaxed">
                AIfacilitator is the AI-powered workshop facilitation platform for teams who want to run smarter, more engaging sessions. It combines real-time AI facilitation, dynamic agenda generation, and post-session analytics in one platform — making professional workshop facilitation accessible to every team, without needing a certified facilitator.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Mission — left-aligned content ───────────────────────────── */}
      <section className="py-16 md:py-20 px-4 bg-gray-50">
        <div className="container mx-auto max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">Our Mission</h2>
          <p className="text-xl text-gray-600 leading-relaxed mb-6">
            To make world-class workshop facilitation accessible to every team — regardless of budget, location, or experience.
          </p>
          <p className="text-gray-500 leading-relaxed">
            Great facilitation is one of the most undervalued skills in business. A well-facilitated workshop can unlock better decisions, stronger alignment, and more creative solutions in a fraction of the time. But professional facilitators are expensive, hard to find, and not always available when you need them. AIfacilitator changes that.
          </p>
        </div>
      </section>

      {/* ── What We Do — left-aligned section header + grid ─────────── */}
      <section className="py-16 md:py-20 px-4 bg-white">
        <div className="container mx-auto max-w-5xl">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            What AIfacilitator Does
          </h2>
          <p className="text-gray-500 text-lg mb-12 max-w-2xl">
            Our AI facilitators handle every aspect of running a structured workshop session.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: <Zap className="h-6 w-6 text-indigo-600" />,
                title: 'Real-time AI facilitation',
                description: 'The AI guides participants through each phase of the workshop, asking structured questions, managing time, and keeping the conversation on track.',
              },
              {
                icon: <Sparkles className="h-6 w-6 text-indigo-600" />,
                title: 'Dynamic agenda generation',
                description: 'The AI generates a tailored agenda based on your workshop type, team size, and stated goals — adapting in real time as the session unfolds.',
              },
              {
                icon: <Users className="h-6 w-6 text-indigo-600" />,
                title: 'Equal participation',
                description: 'The AI ensures every participant has equal time and space to contribute — preventing dominant voices and encouraging quieter team members.',
              },
              {
                icon: <Shield className="h-6 w-6 text-indigo-600" />,
                title: 'Anonymous feedback',
                description: 'Participants can submit responses anonymously, increasing psychological safety and the quality of honest feedback.',
              },
              {
                icon: <BarChart3 className="h-6 w-6 text-indigo-600" />,
                title: 'Post-session analytics',
                description: 'Every session generates a structured report with key insights, decisions made, and prioritised action items — ready to share with your team.',
              },
              {
                icon: <Globe className="h-6 w-6 text-indigo-600" />,
                title: 'Remote-first design',
                description: 'Participants join via a browser link with no account required. AIfacilitator works for in-person, remote, and hybrid teams.',
              },
            ].map(item => (
              <div key={item.title} className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-50 mb-4">
                  {item.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Use Cases — left-aligned section header + grid ───────────── */}
      <section className="py-16 md:py-20 px-4 bg-gray-50">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            What Teams Use AIfacilitator For
          </h2>
          <p className="text-gray-500 text-lg mb-10 max-w-2xl">
            AIfacilitator supports a wide range of workshop formats out of the box.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { title: 'Design Sprints', href: '/use-cases/design-sprint', description: 'Run a complete 5-day design sprint with an AI sprint master guiding every phase.' },
              { title: 'Agile Retrospectives', href: '/use-cases/retrospective', description: 'Run more effective retros with equal participation, anonymous feedback, and automatic action items.' },
              { title: 'Strategic Planning', href: '/use-cases/strategic-planning', description: 'Guide leadership teams through SWOT analysis, OKR setting, and strategic prioritisation.' },
              { title: 'Brainstorming Sessions', href: '/signup', description: 'Generate more ideas with structured AI-facilitated ideation exercises.' },
              { title: 'Team-Building Workshops', href: '/signup', description: 'Build stronger teams with facilitated discussions and collaborative exercises.' },
              { title: 'Decision-Making Meetings', href: '/signup', description: 'Reach better decisions faster with structured facilitation and dot voting.' },
            ].map(item => (
              <Link key={item.title} to={item.href} className="group bg-white rounded-2xl p-5 border border-gray-100 hover:border-indigo-200 hover:shadow-sm transition-all">
                <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-indigo-600 transition-colors">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA (centred — intentional for CTA sections) ─────────────── */}
      <section className="py-16 md:py-20 px-4 bg-gradient-to-br from-indigo-600 to-violet-700">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to run better workshops?
          </h2>
          <p className="text-indigo-200 text-lg mb-8 max-w-xl mx-auto">
            Free plan available. No credit card required. Set up in 60 seconds.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/signup">
              <Button size="lg" className="text-base font-semibold px-10 py-6 bg-white text-indigo-700 hover:bg-indigo-50 rounded-xl shadow-xl">
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/contact">
              <Button size="lg" className="text-base font-semibold px-10 py-6 bg-transparent border-2 border-white/50 text-white hover:bg-white/10 rounded-xl">
                Contact Us
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
