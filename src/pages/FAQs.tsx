
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface FAQ {
  id: number;
  title: string;
  description: string;
  status: boolean;
  category: string;
}

const fetchFAQs = async () => {
  const { data, error } = await supabase
    .from('faqs')
    .select('*')
    .eq('status', true)
    .order('category', { ascending: true })
    .order('id', { ascending: true });
  
  if (error) throw error;
  return data as FAQ[];
};

const LoadingState = () => (
  <div className="space-y-4">
    {[1, 2, 3].map((i) => (
      <Card key={i} className="p-4">
        <div className="space-y-4">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-20 w-full" />
        </div>
      </Card>
    ))}
  </div>
);

const ErrorState = ({ error }: { error: Error }) => (
  <Card className="p-6 bg-red-50 border-red-200">
    <p className="text-red-600 font-medium">Error loading FAQs</p>
    <p className="text-red-500 text-sm mt-1">{error.message}</p>
  </Card>
);

const EmptyState = () => (
  <Card className="p-6">
    <div className="text-center">
      <p className="text-muted-foreground">No FAQs available at the moment.</p>
    </div>
  </Card>
);

const FAQAccordion = ({ faqs }: { faqs: FAQ[] }) => {
  const groupedFaqs = faqs.reduce((acc, faq) => {
    const category = faq.category || 'General';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(faq);
    return acc;
  }, {} as Record<string, FAQ[]>);

  return (
    <>
      {Object.entries(groupedFaqs).map(([category, categoryFaqs]) => (
        <div key={category} className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">{category}</h2>
          <Accordion type="single" collapsible className="space-y-4">
            {categoryFaqs.map((faq) => (
              <AccordionItem
                key={faq.id}
                value={`item-${faq.id}`}
                className="bg-white rounded-lg border shadow-sm px-6"
              >
                <AccordionTrigger className="text-left hover:no-underline py-4">
                  <span className="text-lg font-medium">{faq.title}</span>
                </AccordionTrigger>
                <AccordionContent className="prose prose-sm max-w-none pb-6">
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
  const { data: faqs = [], isLoading, error } = useQuery({
    queryKey: ['faqs'],
    queryFn: fetchFAQs,
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-4xl font-bold text-center mb-4">
          Frequently Asked Questions
        </h1>
        <p className="text-lg text-muted-foreground text-center mb-12">
          Find answers to common questions about our AI facilitation platform
        </p>

        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState error={error as Error} />
        ) : !faqs.length ? (
          <EmptyState />
        ) : (
          <FAQAccordion faqs={faqs} />
        )}

        <div className="mt-12 text-center">
          <p className="text-muted-foreground">
            Can't find what you're looking for?{' '}
            <a href="/contact" className="text-primary hover:underline">
              Contact our support team
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default FAQs;
