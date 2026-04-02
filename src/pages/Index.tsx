import React from 'react';
import { Link } from 'react-router-dom';
import PageHead from '@/components/PageHead';
import { Button } from '@/components/ui/button';
import {
    Users, MessageSquare, BarChart3, Sparkles, ArrowRight,
    Clock, TrendingUp, Globe, Settings, CheckCircle2,
    Zap, Shield, Star
} from 'lucide-react';

const Index = () => {
    return (
        <div className="min-h-screen bg-white">
            <PageHead
                title="AIfacilitator - AI-Powered Workshop Facilitation"
                description="Transform your meetings into engaging, productive sessions with AI-powered workshop facilitation."
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
                        <Link to="/signup" className="w-full sm:w-auto">
                            <Button
                                size="lg"
                                className="w-full sm:w-auto text-base font-semibold px-8 py-6 bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all rounded-xl"
                            >
                                Get Started Free
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

                    {/* Trust signals */}
                    <p className="text-sm text-gray-400 mb-8">No credit card required &nbsp;·&nbsp; Free plan available &nbsp;·&nbsp; Cancel anytime</p>

                    {/* Social proof stats — 2×2 on mobile, 4-column on sm+ */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8 px-4 py-5 rounded-2xl bg-white border border-gray-100 shadow-sm max-w-lg sm:max-w-none mx-auto">
                        {[
                            { value: '10,000+', label: 'Sessions run' },
                            { value: '500+', label: 'Teams worldwide' },
                            { value: '4.9 / 5', label: 'Average rating' },
                            { value: '98%', label: 'Satisfaction rate' },
                        ].map(({ value, label }) => (
                            <div key={label} className="text-center py-1">
                                <div className="text-xl sm:text-2xl font-bold text-gray-900">{value}</div>
                                <div className="text-xs text-gray-500 mt-0.5">{label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Features Section ─────────────────────────────────────── */}
            <section className="py-16 md:py-24 px-4 bg-white">
                <div className="container mx-auto max-w-6xl">
                    <div className="text-center mb-10 md:mb-14">
                        <span className="inline-block mb-3 text-sm font-semibold text-indigo-600 uppercase tracking-widest">What we do</span>
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 text-center">Everything you need to run great workshops</h2>
                        <p className="text-base md:text-lg text-gray-500 max-w-2xl mx-auto text-center px-2">
                            From expert AI facilitators to real-time collaboration and actionable reports — all in one platform.
                        </p>
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
                        {[
                            {
                                icon: <Sparkles className="h-6 w-6 text-indigo-600" />,
                                bg: 'bg-indigo-50',
                                title: 'AI-Powered Facilitation',
                                desc: 'Expert AI facilitators trained in proven methodologies to guide any workshop type.',
                            },
                            {
                                icon: <Users className="h-6 w-6 text-violet-600" />,
                                bg: 'bg-violet-50',
                                title: 'Collaborative Sessions',
                                desc: 'Engage multiple participants in real-time interactive workshops with seamless collaboration.',
                            },
                            {
                                icon: <MessageSquare className="h-6 w-6 text-blue-600" />,
                                bg: 'bg-blue-50',
                                title: 'Smart Conversations',
                                desc: "AI facilitators adapt to your team's needs, asking the right questions at the right time.",
                            },
                            {
                                icon: <BarChart3 className="h-6 w-6 text-emerald-600" />,
                                bg: 'bg-emerald-50',
                                title: 'Actionable Insights',
                                desc: 'Detailed reports and analytics from every session to track progress and outcomes.',
                            },
                        ].map(({ icon, bg, title, desc }) => (
                            <div
                                key={title}
                                className="group rounded-2xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-lg hover:border-indigo-100 hover:-translate-y-1 transition-all duration-200 flex flex-col items-center sm:items-start text-center sm:text-left"
                            >
                                <div className={`mb-4 inline-flex items-center justify-center w-12 h-12 rounded-xl ${bg}`}>
                                    {icon}
                                </div>
                                <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-2 text-center sm:text-left">{title}</h3>
                                <p className="text-gray-500 text-sm leading-relaxed text-center sm:text-left">{desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── How It Works Section ─────────────────────────────────── */}
            <section className="py-16 md:py-24 px-4 bg-gradient-to-b from-slate-50 to-white">
                <div className="container mx-auto max-w-6xl">
                    <div className="text-center mb-10 md:mb-14">
                        <span className="inline-block mb-3 text-sm font-semibold text-indigo-600 uppercase tracking-widest">Simple process</span>
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 text-center">From setup to insights in minutes</h2>
                        <p className="text-base md:text-lg text-gray-500 max-w-2xl mx-auto text-center px-2">
                            No training required. Start your first AI-facilitated workshop in under 5 minutes.
                        </p>
                    </div>
                    <div className="relative grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
                        {/* Connector line (desktop only) */}
                        <div className="hidden lg:block absolute top-6 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-indigo-200 via-violet-200 to-indigo-200" />
                        {[
                            {
                                step: '01',
                                title: 'Choose Your Facilitator',
                                desc: 'Select from our library of expert AI facilitators, each specialised in different workshop types.',
                            },
                            {
                                step: '02',
                                title: 'Create Your Session',
                                desc: 'Set up your workshop with custom parameters, invite participants, and define your goals.',
                            },
                            {
                                step: '03',
                                title: 'Facilitate & Collaborate',
                                desc: 'Let the AI guide your team through structured conversations and decision-making.',
                            },
                            {
                                step: '04',
                                title: 'Review & Act',
                                desc: 'Get comprehensive reports with insights, action items, and next steps.',
                            },
                        ].map(({ step, title, desc }) => (
                            <div key={step} className="relative flex flex-col items-center sm:items-start">
                                <div className="relative mb-5 flex items-center justify-center w-12 h-12 rounded-full bg-indigo-600 text-white font-bold text-sm shadow-lg shadow-indigo-500/30 z-10">
                                    {step}
                                </div>
                                <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-2 text-center sm:text-left">{title}</h3>
                                <p className="text-gray-500 text-sm leading-relaxed text-center sm:text-left">{desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Benefits Section ─────────────────────────────────────── */}
            <section className="py-16 md:py-24 px-4 bg-white">
                <div className="container mx-auto max-w-6xl">
                    <div className="text-center mb-10 md:mb-14">
                        <span className="inline-block mb-3 text-sm font-semibold text-indigo-600 uppercase tracking-widest">Why teams love us</span>
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 text-center">Built for teams that value results</h2>
                        <p className="text-base md:text-lg text-gray-500 max-w-2xl mx-auto text-center px-2">
                            AIfacilitator replaces expensive, inconsistent external facilitators with a scalable, always-available AI alternative.
                        </p>
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
                        {[
                            {
                                icon: <Clock className="h-5 w-5 text-indigo-600" />,
                                bg: 'bg-indigo-50',
                                title: 'Save Time & Money',
                                desc: 'No need to hire expensive external facilitators for every workshop.',
                            },
                            {
                                icon: <Star className="h-5 w-5 text-violet-600" />,
                                bg: 'bg-violet-50',
                                title: 'Consistent Quality',
                                desc: 'Every session follows proven methodologies and best practices.',
                            },
                            {
                                icon: <TrendingUp className="h-5 w-5 text-blue-600" />,
                                bg: 'bg-blue-50',
                                title: 'Scale Effortlessly',
                                desc: 'Run multiple workshops simultaneously across different teams.',
                            },
                            {
                                icon: <BarChart3 className="h-5 w-5 text-emerald-600" />,
                                bg: 'bg-emerald-50',
                                title: 'Data-Driven Insights',
                                desc: 'Track engagement, participation, and outcomes over time.',
                            },
                            {
                                icon: <Globe className="h-5 w-5 text-cyan-600" />,
                                bg: 'bg-cyan-50',
                                title: '24/7 Availability',
                                desc: 'Run workshops whenever it suits your team, anywhere in the world.',
                            },
                            {
                                icon: <Settings className="h-5 w-5 text-orange-600" />,
                                bg: 'bg-orange-50',
                                title: 'Fully Customisable',
                                desc: 'Tailor sessions to your specific needs and organisational context.',
                            },
                        ].map(({ icon, bg, title, desc }) => (
                            <div
                                key={title}
                                className="flex gap-4 items-start rounded-2xl border border-gray-100 bg-white p-5 md:p-6 shadow-sm hover:shadow-md hover:border-indigo-100 hover:-translate-y-0.5 transition-all duration-200"
                            >
                                <div className={`flex-shrink-0 mt-0.5 flex items-center justify-center w-9 h-9 rounded-lg ${bg}`}>
                                    {icon}
                                </div>
                                <div>
                                    <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-1">{title}</h3>
                                    <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Testimonial / Trust Section ──────────────────────────── */}
            <section className="py-16 md:py-20 px-4 bg-gradient-to-b from-slate-50 to-white">
                <div className="container mx-auto max-w-5xl">
                    <div className="text-center mb-10 md:mb-12">
                        <span className="inline-block mb-3 text-sm font-semibold text-indigo-600 uppercase tracking-widest">What teams say</span>
                        <h2 className="text-3xl font-bold text-gray-900 text-center">Trusted by teams worldwide</h2>
                    </div>
                    <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5 md:gap-6">
                        {[
                            {
                                quote: "AIfacilitator transformed how we run retrospectives. Our team is more engaged and we leave every session with clear action items.",
                                author: "Sarah K.",
                                role: "Head of Product, TechCorp",
                            },
                            {
                                quote: "We replaced our external facilitation budget entirely. The AI adapts to our team dynamics better than any human facilitator we've hired.",
                                author: "Marcus L.",
                                role: "VP Engineering, ScaleUp",
                            },
                            {
                                quote: "The session reports are incredible. We can track how our decision-making has improved over 6 months of workshops.",
                                author: "Priya M.",
                                role: "Strategy Director, Innovate Co",
                            },
                        ].map(({ quote, author, role }) => (
                            <div key={author} className="rounded-2xl bg-white border border-gray-100 p-6 shadow-sm">
                                <div className="flex gap-1 mb-4">
                                    {[...Array(5)].map((_, i) => (
                                        <Star key={i} className="h-4 w-4 fill-indigo-500 text-indigo-500" />
                                    ))}
                                </div>
                                <p className="text-gray-600 text-sm leading-relaxed mb-4">"{quote}"</p>
                                <div>
                                    <div className="font-semibold text-gray-900 text-sm">{author}</div>
                                    <div className="text-gray-400 text-xs">{role}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CTA Section ──────────────────────────────────────────── */}
            <section className="py-16 md:py-24 px-4 bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700">
                <div className="container mx-auto max-w-3xl text-center">
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 text-center">Ready to transform your workshops?</h2>
                    <p className="text-base md:text-lg text-indigo-200 mb-10 max-w-xl mx-auto text-center px-2">
                        Join thousands of teams already running more effective, engaging sessions with AIfacilitator.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8 px-4 sm:px-0">
                        <Link to="/signup" className="w-full sm:w-auto">
                            <Button
                                size="lg"
                                className="w-full sm:w-auto text-base font-semibold px-10 py-6 bg-white text-indigo-700 hover:bg-indigo-50 border-0 shadow-xl shadow-indigo-900/30 transition-colors rounded-xl"
                            >
                                Start Your Free Trial
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
                        </Link>
                        <Link to="/pricing" className="w-full sm:w-auto">
                            <Button
                                size="lg"
                                variant="outline"
                                className="w-full sm:w-auto text-base font-semibold px-10 py-6 border-2 border-white/50 text-white hover:bg-white/10 hover:border-white/70 transition-colors rounded-xl"
                            >
                                See Pricing
                            </Button>
                        </Link>
                    </div>
                    <div className="flex flex-wrap justify-center gap-4 md:gap-6 text-sm text-indigo-200">
                        {['Free plan available', 'No credit card required', 'Cancel anytime'].map(item => (
                            <span key={item} className="flex items-center gap-1.5">
                                <CheckCircle2 className="h-4 w-4 text-indigo-300" />
                                {item}
                            </span>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Index;
