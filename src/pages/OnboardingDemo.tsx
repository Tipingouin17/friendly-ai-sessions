/**
 * OnboardingDemo
 *
 * Lightweight activation landing page for newly verified users. It explains the
 * first AI-participant demo path and routes users into the existing workshop
 * creation surface with an onboarding marker instead of creating a separate
 * simulation system.
 */

import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bot, CheckCircle2, MessageSquare, Users } from 'lucide-react';
import PageHead from '@/components/PageHead';
import {
  trackActivationDemoViewed,
  trackActivationDemoStarted,
  trackInviteParticipantsIntent,
} from '@/lib/tracking';

const demoSteps = [
  {
    icon: Bot,
    title: 'Start with an AI-participant demo',
    description: 'Create a short workshop and experience how the AI facilitator guides the conversation before inviting real people.',
  },
  {
    icon: MessageSquare,
    title: 'See the workshop flow in action',
    description: 'Review prompts, timing, and report expectations in a safe first run designed for activation rather than perfection.',
  },
  {
    icon: Users,
    title: 'Invite real participants next',
    description: 'Once the demo feels clear, move to My Workshops and schedule or run a real session with your team.',
  },
];

const OnboardingDemo: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    trackActivationDemoViewed('post_verification');
  }, []);

  const startDemo = () => {
    trackActivationDemoStarted('onboarding_demo_page');
    navigate('/my-facilitators?onboarding=demo', { replace: false });
  };

  const inviteRealParticipants = () => {
    trackInviteParticipantsIntent('onboarding_demo_page');
    navigate('/my-facilitators?onboarding=invite', { replace: false });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-4 py-12">
      <PageHead
        title="Start your first AI workshop demo"
        description="Try AIfacilitator with a guided AI-participant demo, then invite real participants when you are ready."
        noIndex
      />

      <main className="mx-auto max-w-5xl">
        <section className="rounded-3xl bg-white p-8 shadow-xl md:p-12">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100">
              <Bot className="h-9 w-9 text-indigo-600" />
            </div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-indigo-600">
              Email verified — next step
            </p>
            <h1 className="mb-4 text-3xl font-bold tracking-tight text-gray-900 md:text-5xl">
              Run a first AI workshop demo in a few minutes
            </h1>
            <p className="mx-auto mb-8 max-w-2xl text-lg text-gray-600">
              The fastest way to understand AIfacilitator is to create a short demo workshop first. You can see how the AI facilitator frames the session before you invite real participants.
            </p>

            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={startDemo}
                className="inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 px-7 py-3 text-sm font-semibold text-white shadow-lg transition hover:opacity-90 sm:w-auto"
              >
                Start AI demo workshop
              </button>
              <button
                type="button"
                onClick={inviteRealParticipants}
                className="inline-flex w-full items-center justify-center rounded-full border border-indigo-200 bg-white px-7 py-3 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50 sm:w-auto"
              >
                Create a real workshop
              </button>
            </div>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {demoSteps.map((step) => {
              const Icon = step.icon;
              return (
                <article key={step.title} className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-6 text-left">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h2 className="mb-2 text-lg font-semibold text-gray-900">{step.title}</h2>
                  <p className="text-sm leading-6 text-gray-600">{step.description}</p>
                </article>
              );
            })}
          </div>

          <div className="mt-10 rounded-2xl border border-emerald-100 bg-emerald-50 p-5 text-left">
            <div className="flex gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
              <div>
                <h2 className="font-semibold text-emerald-950">Recommended activation path</h2>
                <p className="mt-1 text-sm leading-6 text-emerald-900">
                  Start with the demo path if you are exploring the product alone. Choose the real-workshop path if you already know who you want to invite.
                </p>
              </div>
            </div>
          </div>

          <p className="mt-8 text-center text-sm text-gray-500">
            Prefer to explore later?{' '}
            <Link to="/my-facilitators" className="font-semibold text-indigo-600 hover:underline">
              Go to My Workshops
            </Link>
          </p>
        </section>
      </main>
    </div>
  );
};

export default OnboardingDemo;
