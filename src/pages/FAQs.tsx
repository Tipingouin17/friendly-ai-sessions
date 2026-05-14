/**
 * FAQs
 *
 * Page for the AIfacilitator application.
 */

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Link } from "react-router-dom";
import PageHead from "@/components/PageHead";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageCircle, Zap } from "lucide-react";

interface FAQ {
  id: number;
  title: string;
  description: string;
  status: boolean;
  category: string;
}

// Static fallback FAQs shown when the database is empty
const FALLBACK_FAQS: FAQ[] = [
  {
    id: 1,
    category: 'Getting Started',
    title: 'What is AIfacilitator?',
    description: 'AIfacilitator is an AI-powered workshop facilitation platform. It provides expert AI facilitators that guide your team through structured conversations, decisions, and workshops — replacing the need for expensive external facilitators while delivering consistent, high-quality outcomes every time.',
    status: true,
  },
  {
    id: 2,
    category: 'Getting Started',
    title: 'How do I get started?',
    description: 'Simply sign up for a free account, choose an AI facilitator from our library, create your first session, and invite your team. You can run your first workshop in under 5 minutes. No training or setup is required.',
    status: true,
  },
  {
    id: 3,
    category: 'Getting Started',
    title: 'Do I need a credit card to sign up?',
    description: 'No. Our Free plan is completely free and requires no credit card. You can upgrade to a paid plan at any time from your account settings.',
    status: true,
  },
  {
    id: 4,
    category: 'Plans & Pricing',
    title: 'What plans are available?',
    description: 'We offer four plans: Free (2 facilitators, 5 sessions/month), Starter (10 facilitators, 50 sessions/month), Premium (unlimited everything + priority support), and Enterprise (custom pricing with dedicated support and custom branding). Visit our Pricing page for full details.',
    status: true,
  },
  {
    id: 5,
    category: 'Plans & Pricing',
    title: 'Can I change my plan at any time?',
    description: 'Yes. You can upgrade or downgrade your plan at any time from your account settings. Upgrades take effect immediately. Downgrades take effect at the end of your current billing cycle.',
    status: true,
  },
  {
    id: 6,
    category: 'Plans & Pricing',
    title: 'Is there a discount for annual billing?',
    description: 'Yes — annual billing saves you up to 20% compared to monthly billing. You can switch to annual billing from your account settings at any time.',
    status: true,
  },
  {
    id: 7,
    category: 'Sessions & Facilitation',
    title: 'What types of workshops can I run?',
    description: 'AIfacilitator supports a wide range of workshop types including retrospectives, strategic planning, brainstorming, decision-making, team alignment, design thinking, and more. Each AI facilitator is trained in specific methodologies to match your workshop goals.',
    status: true,
  },
  {
    id: 8,
    category: 'Sessions & Facilitation',
    title: 'How many participants can join a session?',
    description: 'The Free plan supports up to 10 participants per session. Starter supports up to 50, and Premium and Enterprise support unlimited participants.',
    status: true,
  },
  {
    id: 9,
    category: 'Sessions & Facilitation',
    title: 'Are session recordings and reports available?',
    description: 'Yes. All sessions on Starter and above plans include detailed session reports with insights, action items, and participant engagement data. You can export these reports as PDF or share them directly with your team.',
    status: true,
  },
  {
    id: 10,
    category: 'Security & Privacy',
    title: 'Is my data secure?',
    description: 'Absolutely. All data is encrypted in transit and at rest. We are GDPR compliant and never share your session data with third parties. You can request a full data export or deletion at any time from your account settings.',
    status: true,
  },
  {
    id: 11,
    category: 'Security & Privacy',
    title: 'Where is my data stored?',
    description: 'Your data is stored in secure, EU-based data centres. We use industry-standard encryption and access controls to protect your information at all times.',
    status: true,
  },
  {
    id: 12,
    category: 'AI Workshop Facilitation',
    title: 'What is the best AI tool for workshop facilitation?',
    description: 'The best AI tool for workshop facilitation should do more than store notes or provide a blank canvas. It should guide the conversation, structure the agenda, help every participant contribute, capture decisions, and turn the session into action items. AIfacilitator is built specifically for this use case, including design sprints, retrospectives, strategic planning and remote workshops.',
    status: true,
  },
  {
    id: 13,
    category: 'AI Workshop Facilitation',
    title: 'Can AI facilitate a design sprint?',
    description: 'Yes. AIfacilitator can guide teams through structured design sprint phases such as problem framing, ideation, decision-making, prototyping preparation and testing synthesis. It helps teams stay on track without needing to hire an external sprint facilitator for every session.',
    status: true,
  },
  {
    id: 14,
    category: 'AI Workshop Facilitation',
    title: 'Can AI run an agile retrospective?',
    description: 'Yes. AIfacilitator can support agile retrospectives by creating a neutral structure, encouraging equal participation, collecting feedback, identifying patterns, and turning discussion into sprint improvement actions.',
    status: true,
  },
  {
    id: 15,
    category: 'AI Workshop Facilitation',
    title: 'How is AIfacilitator different from Miro, SessionLab or Stormz?',
    description: 'Miro is primarily a visual collaboration canvas, SessionLab is mainly an agenda-planning tool, and Stormz supports collaborative workshop activities. AIfacilitator is different because it acts as an active AI facilitator during the session: it guides participants, adapts the conversation and helps produce decisions, summaries and action items.',
    status: true,
  },
];

const fetchFAQs = async () => {
  try {
    const { data, error } = await api
      .from('faqs')
      .select('*')
      .eq('status', true)
      .order('category', { ascending: true })
      .order('id', { ascending: true });

    if (error) throw error;
    // If DB is empty, return fallback so the page renders immediately
    return (data && data.length > 0 ? data : FALLBACK_FAQS) as FAQ[];
  } catch {
    return FALLBACK_FAQS;
  }
};

const LoadingState = () => (
  <div className="space-y-4">
    {[1, 2, 3, 4].map((i) => (
      <div key={i} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="space-y-3">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    ))}
  </div>
);

const FAQAccordion = ({ faqs }: { faqs: FAQ[] }) => {
  const groupedFaqs = faqs.reduce((acc, faq) => {
    const category = faq.category || 'General';
    if (!acc[category]) acc[category] = [];
    acc[category].push(faq);
    return acc;
  }, {} as Record<string, FAQ[]>);

  return (
    <>
      {Object.entries(groupedFaqs).map(([category, categoryFaqs]) => (
        <div key={category} className="mb-10">
          <h2 className="text-sm font-semibold text-indigo-600 uppercase tracking-widest mb-4">{category}</h2>
          <Accordion type="single" collapsible className="space-y-3">
            {categoryFaqs.map((faq) => (
              <AccordionItem
                key={faq.id}
                value={`item-${faq.id}`}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 hover:border-indigo-100 transition-colors"
              >
                <AccordionTrigger className="text-left hover:no-underline py-5">
                  <span className="text-base font-semibold text-gray-900 pr-4">{faq.title}</span>
                </AccordionTrigger>
                <AccordionContent className="text-gray-500 text-sm leading-relaxed pb-5">
                  {faq.description}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      ))}
    </>
  );
};

const FAQs = () => {
  const { data: faqs = FALLBACK_FAQS, isLoading, error } = useQuery({
    queryKey: ['faqs'],
    queryFn: fetchFAQs,
    // Use static fallback as initial data so page renders immediately
    initialData: FALLBACK_FAQS,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Use DB FAQs if available, otherwise fall back to static content
  const displayFaqs = faqs.length > 0 ? faqs : FALLBACK_FAQS;
  const faqPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: displayFaqs.map((faq) => ({
      '@type': 'Question',
      name: faq.title,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.description,
      },
    })),
  };

  return (
    <div className="min-h-screen bg-white">
      <PageHead
        title="FAQ — AI Workshop Facilitation, Design Sprints and Retrospectives"
        description="Answers about AIfacilitator, AI workshop facilitation, design sprints, agile retrospectives, strategic planning, pricing, security and participant experience."
        canonical="https://aifacilitator.ai/faqs"
        jsonLd={[faqPageSchema]}
      />

      {/* Hero */}
      <div className="bg-gradient-to-b from-indigo-50 to-white pt-28 pb-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <span className="inline-flex items-center gap-2 mb-4 px-4 py-1.5 rounded-full bg-indigo-100 text-indigo-700 text-sm font-semibold border border-indigo-200">
            <Zap className="h-3.5 w-3.5" />
            Help Centre
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 text-center">
            Frequently Asked Questions
          </h1>
          <p className="text-lg text-gray-500 text-center">
            Everything you need to know about AIfacilitator. Can't find the answer you're looking for?{' '}
            <Link to="/contact" className="text-indigo-600 hover:underline font-medium">
              Contact our team
            </Link>
            .
          </p>
        </div>
      </div>

      {/* FAQ Content */}
      <div className="max-w-3xl mx-auto px-4 pb-24">
        {isLoading ? (
          <LoadingState />
        ) : error ? (
          // On error, still show fallback FAQs
          <FAQAccordion faqs={FALLBACK_FAQS} />
        ) : (
          <FAQAccordion faqs={displayFaqs} />
        )}

        {/* CTA */}
        <div className="mt-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 p-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/20 mb-4">
            <MessageCircle className="h-6 w-6 text-white" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Still have questions?</h3>
          <p className="text-indigo-200 text-sm mb-5">
            Our team is happy to help. Reach out and we'll get back to you within 24 hours.
          </p>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-indigo-700 font-semibold text-sm hover:bg-indigo-50 transition-colors shadow-lg shadow-indigo-900/20"
          >
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  );
};

export default FAQs;
