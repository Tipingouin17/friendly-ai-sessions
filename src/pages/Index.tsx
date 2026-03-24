import React from 'react';
import { Link } from 'react-router-dom';
import PageHead from '@/components/PageHead';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, MessageSquare, BarChart3, Sparkles, ArrowRight, CheckCircle } from 'lucide-react';

const Index = () => {
    return (
        <div className="min-h-screen">
            <PageHead title="MyFacilitator - AI-Powered Workshop Facilitation" description="Transform your meetings into engaging, productive sessions with AI-powered workshop facilitation." />
            {/* Hero Section */}
            <section className="pt-32 pb-20 px-4 bg-gradient-to-b from-primary/10 to-white">
                <div className="container mx-auto max-w-6xl text-center">
                    <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-amber-600 bg-clip-text text-transparent">
                        Welcome to MyFacilitator
                    </h1>
                    <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
                        AI-powered workshop facilitation that transforms your meetings into engaging, productive sessions
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link to="/signup">
                            <Button size="lg" className="text-lg px-8 py-6">
                                Get Started Free
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
                        </Link>
                        <Link to="/pricing">
                            <Button size="lg" variant="outline" className="text-lg px-8 py-6">
                                View Pricing
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-20 px-4">
                <div className="container mx-auto max-w-6xl">
                    <h2 className="text-4xl font-bold text-center mb-12">What is MyFacilitator?</h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <Card className="hover:shadow-lg transition-shadow">
                            <CardHeader>
                                <Sparkles className="h-12 w-12 text-primary mb-4" />
                                <CardTitle>AI-Powered Facilitation</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <CardDescription className="text-base">
                                    Choose from expert AI facilitators trained to guide your workshops with proven methodologies
                                </CardDescription>
                            </CardContent>
                        </Card>

                        <Card className="hover:shadow-lg transition-shadow">
                            <CardHeader>
                                <Users className="h-12 w-12 text-primary mb-4" />
                                <CardTitle>Collaborative Sessions</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <CardDescription className="text-base">
                                    Engage multiple participants in real-time interactive workshops with seamless collaboration
                                </CardDescription>
                            </CardContent>
                        </Card>

                        <Card className="hover:shadow-lg transition-shadow">
                            <CardHeader>
                                <MessageSquare className="h-12 w-12 text-primary mb-4" />
                                <CardTitle>Smart Conversations</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <CardDescription className="text-base">
                                    AI facilitators adapt to your team's needs, asking the right questions at the right time
                                </CardDescription>
                            </CardContent>
                        </Card>

                        <Card className="hover:shadow-lg transition-shadow">
                            <CardHeader>
                                <BarChart3 className="h-12 w-12 text-primary mb-4" />
                                <CardTitle>Actionable Insights</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <CardDescription className="text-base">
                                    Get detailed reports and analytics from every session to track progress and outcomes
                                </CardDescription>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </section>

            {/* How It Works Section */}
            <section className="py-20 px-4 bg-gray-50">
                <div className="container mx-auto max-w-4xl">
                    <h2 className="text-4xl font-bold text-center mb-12">How It Works</h2>
                    <div className="space-y-8">
                        <div className="flex gap-4 items-start">
                            <div className="flex-shrink-0 w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center font-bold">
                                1
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold mb-2">Choose Your Facilitator</h3>
                                <p className="text-gray-600">
                                    Select from our library of expert AI facilitators, each specialized in different workshop types and methodologies
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-4 items-start">
                            <div className="flex-shrink-0 w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center font-bold">
                                2
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold mb-2">Create Your Session</h3>
                                <p className="text-gray-600">
                                    Set up your workshop with custom parameters, invite participants, and define your goals
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-4 items-start">
                            <div className="flex-shrink-0 w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center font-bold">
                                3
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold mb-2">Facilitate & Collaborate</h3>
                                <p className="text-gray-600">
                                    Let the AI guide your team through structured conversations, exercises, and decision-making processes
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-4 items-start">
                            <div className="flex-shrink-0 w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center font-bold">
                                4
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold mb-2">Review & Act</h3>
                                <p className="text-gray-600">
                                    Get comprehensive reports with insights, action items, and next steps to drive real results
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Benefits Section */}
            <section className="py-20 px-4">
                <div className="container mx-auto max-w-6xl">
                    <h2 className="text-4xl font-bold text-center mb-12">Why MyFacilitator?</h2>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="flex gap-3">
                            <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0 mt-1" />
                            <div>
                                <h3 className="text-lg font-semibold mb-1">Save Time & Money</h3>
                                <p className="text-gray-600">No need to hire expensive external facilitators for every workshop</p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0 mt-1" />
                            <div>
                                <h3 className="text-lg font-semibold mb-1">Consistent Quality</h3>
                                <p className="text-gray-600">Every session follows proven methodologies and best practices</p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0 mt-1" />
                            <div>
                                <h3 className="text-lg font-semibold mb-1">Scale Effortlessly</h3>
                                <p className="text-gray-600">Run multiple workshops simultaneously across different teams</p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0 mt-1" />
                            <div>
                                <h3 className="text-lg font-semibold mb-1">Data-Driven Insights</h3>
                                <p className="text-gray-600">Track engagement, participation, and outcomes over time</p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0 mt-1" />
                            <div>
                                <h3 className="text-lg font-semibold mb-1">24/7 Availability</h3>
                                <p className="text-gray-600">Run workshops whenever it suits your team, anywhere in the world</p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0 mt-1" />
                            <div>
                                <h3 className="text-lg font-semibold mb-1">Customizable</h3>
                                <p className="text-gray-600">Tailor sessions to your specific needs and organizational context</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 px-4 bg-gradient-to-r from-primary to-amber-600 text-white">
                <div className="container mx-auto max-w-4xl text-center">
                    <h2 className="text-4xl font-bold mb-6">Ready to Transform Your Workshops?</h2>
                    <p className="text-xl mb-8 opacity-90">
                        Join teams already using MyFacilitator to run more effective, engaging sessions
                    </p>
                    <Link to="/signup">
                        <Button size="lg" variant="secondary" className="text-lg px-8 py-6">
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
