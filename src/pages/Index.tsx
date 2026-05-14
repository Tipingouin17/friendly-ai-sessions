/**
 * Index (Home Page)
 *
 * Marketing landing page for the AIfacilitator application.
 * CTA buttons are auth-aware: authenticated users are directed to
 * /my-facilitators while anonymous visitors are sent to /signup.
 */
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PageHead from '@/components/PageHead';
import SectionHeading from '@/components/SectionHeading';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import {
    Users, MessageSquare, BarChart3, Sparkles, ArrowRight,
    Clock, TrendingUp, Globe, Settings, CheckCircle2,
    Zap, Shield, Star,
} from 'lucide-react';

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
    price: '0',
    priceCurrency: 'EUR',
    availability: 'https://schema.org/InStock',
    url: 'https://aifacilitator.ai/pricing',
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

const Index = () => {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();

    /** Primary CTA destination — logged-in users go straight to their facilitators. */
    const primaryCtaHref = isAuthenticated ? '/my-facilitators' : '/signup';
    const primaryCtaLabel = isAuthenticated ? 'Go to My Facilitators' : 'Get Started Free';

    return (
        <div className="min-h-screen bg-white">
            <PageHead
                title="AI Workshop Facilitation Software for Teams"
                description="AIfacilitator is an AI-powered workshop facilitation platform for design sprints, agile retrospectives, strategic planning, brainstorming and remote team workshops."
                canonical="https://aifacilitator.ai/"
                jsonLd={[SCHEMA_SOFTWARE_APPLICATION, SCHEMA_ORGANIZATION, SCHEMA_WEBSITE, SCHEMA_FAQ_HOME]}
            />

            {/* ── Hero Section ─────────────────────────────────────────── */}
            <section className="relative pt-28 pb-16 md:pb-24 px-4 overflow-hidden">
                {/* Background gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-violet-50 pointer-events-none" />
                {/* Decorative orbs */}
                <div className="absolute top-10 right-[10%] w-72 h-72 bg-indigo-200/40 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-[5%] w-96 h-96 bg-violet-200/30 rounded-full blur-3xl pointer-events-none" />

                <div className="relative container mx-auto max-w-5xl text-center">
                    {/* Badge */}
                    <span className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full bg-indigo-100 text-indigo-700 text-sm font-semibold tracking-wide border border-indigo-200">
                        <Zap className="h-3.5 w-3.5" />
                        AI-Powered Facilitation Platform
                    </span>

                    {/* Headline */}
                    <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold mb-6 leading-[1.1] tracking-tight text-center">
                        <span className="text-gray-900">Run Better</span>
                        <br />
                        <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-500 bg-clip-text text-transparent">
                            Workshops with AI
                        </span>
                    </h1>

                    {/* Subheadline */}
                    <p className="text-lg md:text-xl lg:text-2xl text-gray-500 mb-10 max-w-2xl mx-auto leading-relaxed text-center px-2">
                        Expert AI facilitators that guide your team through structured conversations, decisions, and outcomes — every time.
                    </p>

                    {/* CTAs */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10 px-4 sm:px-0">
                        <Link to={primaryCtaHref} className="w-full sm:w-auto">
                            <Button
                                size="lg"
                                className="w-full sm:w-auto text-base font-semibold px-8 py-6 bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all rounded-xl"
                            >
                                {primaryCtaLabel}
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
                        </Link>
                        <Link to="/pricing" className="w-full sm:w-auto">
                            <Button
                                size="lg"
                                variant="outline"
                                className="w-full sm:w-auto text-base font-semibold px-8 py-6 border-2 border-gray-200 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all rounded-xl"
                            >
                                View Pricing
                            </Button>
                        </Link>
                    </div>

                    {/* Trust signals — only shown to anonymous visitors */}
                    {!isAuthenticated && (
                        <p className="text-sm text-gray-400 mb-8">No credit card required &nbsp;·&nbsp; Free plan available &nbsp;·&nbsp; Cancel anytime</p>
                    )}

                    {/* Social proof stats — 2×2 on mobile, 4-column on sm+ */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8 px-4 py-5 rounded-2xl bg-white border border-gray-100 shadow-sm max-w-lg sm:max-w-none mx-auto">
                        {[
                            { value: '10,000+', label: 'Sessions Run' },
                            { value: '500+', label: 'Teams Served' },
                            { value: '98%', label: 'Satisfaction Rate' },
                            { value: '40%', label: 'Time Saved' },
                        ].map(stat => (
                            <div key={stat.label} className="text-center">
                                <div className="text-2xl sm:text-3xl font-bold text-indigo-600">{stat.value}</div>
                                <div className="text-xs sm:text-sm text-gray-500 mt-1">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Features Section ─────────────────────────────────────── */}
            <section className="py-16 md:py-24 px-4 bg-gray-50">
                <div className="container mx-auto max-w-6xl">
                    <SectionHeading
                        title="Everything you need to run great workshops"
                        subtitle="AIfacilitator combines the expertise of a professional facilitator with the scalability of AI."
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[
                            {
                                icon: <Sparkles className="h-6 w-6 text-indigo-600" />,
                                title: 'AI-Powered Guidance',
                                description: 'Intelligent facilitators that adapt to your team\'s needs in real time.',
                            },
                            {
                                icon: <Users className="h-6 w-6 text-indigo-600" />,
                                title: 'Multi-Participant Sessions',
                                description: 'Bring your whole team together with seamless multi-user support.',
                            },
                            {
                                icon: <MessageSquare className="h-6 w-6 text-indigo-600" />,
                                title: 'Structured Conversations',
                                description: 'Keep discussions focused and productive with proven facilitation frameworks.',
                            },
                            {
                                icon: <BarChart3 className="h-6 w-6 text-indigo-600" />,
                                title: 'Session Analytics',
                                description: 'Get insights into participation, engagement, and outcomes after every session.',
                            },
                            {
                                icon: <Settings className="h-6 w-6 text-indigo-600" />,
                                title: 'Fully Customisable',
                                description: 'Tailor facilitator personas, agendas, and workflows to your exact needs.',
                            },
                            {
                                icon: <Shield className="h-6 w-6 text-indigo-600" />,
                                title: 'Enterprise-Grade Security',
                                description: 'Your data is encrypted and never used to train AI models.',
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

            {/* ── How It Works ─────────────────────────────────────────── */}
            <section className="py-16 md:py-24 px-4 bg-white">
                <div className="container mx-auto max-w-5xl">
                    <SectionHeading
                        title="Up and running in minutes"
                        subtitle="No setup, no training, no hassle."
                    />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            { step: '1', icon: <Globe className="h-6 w-6 text-indigo-600" />, title: 'Choose a Facilitator', description: 'Pick from our library of expert AI facilitators or create your own.' },
                            { step: '2', icon: <Clock className="h-6 w-6 text-indigo-600" />, title: 'Invite Your Team', description: 'Share a link — participants join instantly, no account required.' },
                            { step: '3', icon: <TrendingUp className="h-6 w-6 text-indigo-600" />, title: 'Run Your Session', description: 'The AI facilitator guides the conversation and captures outcomes.' },
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

            {/* ── Testimonials ─────────────────────────────────────────── */}
            <section className="py-16 md:py-24 px-4 bg-gray-50">
                <div className="container mx-auto max-w-5xl">
                    <SectionHeading title="Loved by teams everywhere" />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { quote: 'AIfacilitator cut our meeting time in half while doubling the quality of our decisions.', author: 'Sarah K.', role: 'Product Lead' },
                            { quote: 'Finally, a tool that keeps remote teams engaged and on track without a dedicated facilitator.', author: 'Marcus T.', role: 'Engineering Manager' },
                            { quote: 'The AI adapts to our team dynamics in a way I didn\'t think was possible. Genuinely impressive.', author: 'Priya M.', role: 'Agile Coach' },
                        ].map(t => (
                            <div key={t.author} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                                <div className="flex gap-1 mb-4">
                                    {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />)}
                                </div>
                                <p className="text-gray-700 text-sm leading-relaxed mb-4">"{t.quote}"</p>
                                <div>
                                    <div className="font-semibold text-gray-900 text-sm">{t.author}</div>
                                    <div className="text-gray-400 text-xs">{t.role}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CTA Section ──────────────────────────────────────────── */}
            <section className="py-16 md:py-24 px-4 bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700">
                <div className="container mx-auto max-w-3xl text-center">
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 text-center">
                        {isAuthenticated ? 'Ready to start your next session?' : 'Ready to transform your workshops?'}
                    </h2>
                    <p className="text-base md:text-lg text-indigo-200 mb-10 max-w-xl mx-auto text-center px-2">
                        {isAuthenticated
                            ? 'Head to your facilitators and kick off a session in seconds.'
                            : 'Join thousands of teams already running more effective, engaging sessions with AIfacilitator.'}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8 px-4 sm:px-0">
                        <Link to={primaryCtaHref} className="w-full sm:w-auto">
                            <Button
                                size="lg"
                                className="w-full sm:w-auto text-base font-semibold px-10 py-6 bg-white text-indigo-700 hover:bg-indigo-50 border-0 shadow-xl shadow-indigo-900/30 transition-colors rounded-xl"
                            >
                                {primaryCtaLabel}
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
                        </Link>
                        {!isAuthenticated && (
                            <Link to="/pricing" className="w-full sm:w-auto">
                                <Button
                                    size="lg"
                                    className="w-full sm:w-auto text-base font-semibold px-10 py-6 bg-transparent border-2 border-white/50 text-white hover:bg-white/10 hover:border-white/70 transition-colors rounded-xl"
                                >
                                    See Pricing
                                </Button>
                            </Link>
                        )}
                    </div>
                    {!isAuthenticated && (
                        <div className="flex flex-wrap justify-center gap-4 md:gap-6 text-sm text-indigo-200">
                            {['Free plan available', 'No credit card required', 'Cancel anytime'].map(item => (
                                <span key={item} className="flex items-center gap-1.5">
                                    <CheckCircle2 className="h-4 w-4 text-indigo-300" />
                                    {item}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
};

export default Index;
