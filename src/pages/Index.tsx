import React from 'react';
import { Link } from 'react-router-dom';
import PageHead from '@/components/PageHead';
import { Button } from '@/components/ui/button';
import { Users, MessageSquare, BarChart3, Sparkles, ArrowRight, Clock, TrendingUp, Globe, Settings } from 'lucide-react';

const Index = () => {
    return (
        <div className="min-h-screen">
            <PageHead
                title="MyFacilitator - AI-Powered Workshop Facilitation"
                description="Transform your meetings into engaging, productive sessions with AI-powered workshop facilitation."
            />

            {/* ── Hero Section ─────────────────────────────────────────── */}
            <section className="relative pt-32 pb-28 px-4 overflow-hidden bg-gradient-to-b from-amber-50 via-yellow-50/60 to-white">
                {/* Subtle decorative blobs for depth */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />
                <div className="relative container mx-auto max-w-4xl text-center">
                    <span className="inline-block mb-4 px-4 py-1.5 rounded-full bg-primary/15 text-primary text-sm font-semibold tracking-wide uppercase">
                        AI-Powered Facilitation
                    </span>
                    <h1 className="text-5xl md:text-6xl font-extrabold mb-6 leading-tight bg-gradient-to-r from-amber-500 via-primary to-amber-600 bg-clip-text text-transparent">
                        Welcome to MyFacilitator
                    </h1>
                    <p className="text-xl md:text-2xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
                        AI-powered workshop facilitation that transforms your meetings into engaging, productive sessions
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link to="/signup">
                            <Button size="lg" className="text-base font-semibold px-8 py-6 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-shadow">
                                Get Started Free
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
                        </Link>
                        <Link to="/pricing">
                            <Button
                                size="lg"
                                variant="outline"
                                className="text-base font-semibold px-8 py-6 border-2 border-gray-300 hover:border-primary hover:text-primary transition-colors"
                            >
                                View Pricing
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>

            {/* ── Features Section ─────────────────────────────────────── */}
            <section className="py-24 px-4">
                <div className="container mx-auto max-w-6xl">
                    <div className="text-center mb-14">
                        <h2 className="text-4xl font-bold text-gray-900 mb-4">What is MyFacilitator?</h2>
                        <p className="text-lg text-gray-500 max-w-2xl mx-auto">
                            Everything you need to run structured, effective workshops — powered by AI
                        </p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            {
                                icon: <Sparkles className="h-6 w-6 text-primary" />,
                                title: 'AI-Powered Facilitation',
                                desc: 'Choose from expert AI facilitators trained to guide your workshops with proven methodologies',
                            },
                            {
                                icon: <Users className="h-6 w-6 text-primary" />,
                                title: 'Collaborative Sessions',
                                desc: 'Engage multiple participants in real-time interactive workshops with seamless collaboration',
                            },
                            {
                                icon: <MessageSquare className="h-6 w-6 text-primary" />,
                                title: 'Smart Conversations',
                                desc: "AI facilitators adapt to your team's needs, asking the right questions at the right time",
                            },
                            {
                                icon: <BarChart3 className="h-6 w-6 text-primary" />,
                                title: 'Actionable Insights',
                                desc: 'Get detailed reports and analytics from every session to track progress and outcomes',
                            },
                        ].map(({ icon, title, desc }) => (
                            <div
                                key={title}
                                className="group rounded-2xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-200"
                            >
                                <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                                    {icon}
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
                                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── How It Works Section ─────────────────────────────────── */}
            <section className="py-24 px-4 bg-amber-50/50">
                <div className="container mx-auto max-w-6xl">
                    <div className="text-center mb-14">
                        <h2 className="text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
                        <p className="text-lg text-gray-500 max-w-2xl mx-auto">
                            From setup to insights in four simple steps
                        </p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {[
                            {
                                step: '1',
                                title: 'Choose Your Facilitator',
                                desc: 'Select from our library of expert AI facilitators, each specialised in different workshop types and methodologies',
                            },
                            {
                                step: '2',
                                title: 'Create Your Session',
                                desc: 'Set up your workshop with custom parameters, invite participants, and define your goals',
                            },
                            {
                                step: '3',
                                title: 'Facilitate & Collaborate',
                                desc: 'Let the AI guide your team through structured conversations, exercises, and decision-making processes',
                            },
                            {
                                step: '4',
                                title: 'Review & Act',
                                desc: 'Get comprehensive reports with insights, action items, and next steps to drive real results',
                            },
                        ].map(({ step, title, desc }) => (
                            <div key={step} className="relative flex flex-col items-start">
                                <div className="mb-4 flex items-center justify-center w-12 h-12 rounded-full bg-primary text-white font-bold text-lg shadow-md shadow-primary/30">
                                    {step}
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
                                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Benefits Section ─────────────────────────────────────── */}
            <section className="py-24 px-4">
                <div className="container mx-auto max-w-6xl">
                    <div className="text-center mb-14">
                        <h2 className="text-4xl font-bold text-gray-900 mb-4">Why MyFacilitator?</h2>
                        <p className="text-lg text-gray-500 max-w-2xl mx-auto">
                            Built for teams that value time, quality, and results
                        </p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[
                            {
                                icon: <Clock className="h-5 w-5 text-primary" />,
                                title: 'Save Time & Money',
                                desc: 'No need to hire expensive external facilitators for every workshop',
                            },
                            {
                                icon: <Sparkles className="h-5 w-5 text-primary" />,
                                title: 'Consistent Quality',
                                desc: 'Every session follows proven methodologies and best practices',
                            },
                            {
                                icon: <TrendingUp className="h-5 w-5 text-primary" />,
                                title: 'Scale Effortlessly',
                                desc: 'Run multiple workshops simultaneously across different teams',
                            },
                            {
                                icon: <BarChart3 className="h-5 w-5 text-primary" />,
                                title: 'Data-Driven Insights',
                                desc: 'Track engagement, participation, and outcomes over time',
                            },
                            {
                                icon: <Globe className="h-5 w-5 text-primary" />,
                                title: '24/7 Availability',
                                desc: 'Run workshops whenever it suits your team, anywhere in the world',
                            },
                            {
                                icon: <Settings className="h-5 w-5 text-primary" />,
                                title: 'Customisable',
                                desc: 'Tailor sessions to your specific needs and organisational context',
                            },
                        ].map(({ icon, title, desc }) => (
                            <div
                                key={title}
                                className="flex gap-4 items-start rounded-2xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-200"
                            >
                                <div className="flex-shrink-0 mt-0.5 flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10">
                                    {icon}
                                </div>
                                <div>
                                    <h3 className="text-base font-semibold text-gray-900 mb-1">{title}</h3>
                                    <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CTA Section ──────────────────────────────────────────── */}
            <section className="py-24 px-4 bg-gradient-to-br from-amber-500 to-amber-600">
                <div className="container mx-auto max-w-3xl text-center">
                    <h2 className="text-4xl font-bold text-white mb-4">Ready to Transform Your Workshops?</h2>
                    <p className="text-lg text-white/80 mb-10 max-w-xl mx-auto">
                        Join teams already using MyFacilitator to run more effective, engaging sessions
                    </p>
                    <Link to="/signup">
                        <Button
                            size="lg"
                            className="text-base font-semibold px-10 py-6 bg-white text-amber-600 hover:bg-amber-50 border-0 shadow-xl shadow-amber-900/20 transition-colors"
                        >
                            Start Your Free Trial
                            <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                    </Link>
                </div>
            </section>
        </div>
    );
};

export default Index;
