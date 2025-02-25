
import { ChevronDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface FAQ {
  id: number;
  title: string;
  description: string;
  status: boolean;
}

const FAQs = () => {
  const { data: faqs = [], isLoading } = useQuery({
    queryKey: ['faqs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('faqs')
        .select('*')
        .eq('status', true)
        .order('id', { ascending: true });
      
      if (error) throw error;
      return data;
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-4xl font-bold text-center mb-8">Frequently Asked Questions</h1>
          <p className="text-lg text-muted-foreground text-center">Loading FAQs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-4xl font-bold text-center mb-8">Frequently Asked Questions</h1>
        <p className="text-lg text-muted-foreground text-center mb-12">
          Find answers to common questions about our AI facilitation platform
        </p>
        
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq) => (
            <AccordionItem key={faq.id} value={`item-${faq.id}`}>
              <AccordionTrigger className="text-left">
                {faq.title}
              </AccordionTrigger>
              <AccordionContent>
                {faq.description}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {faqs.length === 0 && (
          <p className="text-center text-muted-foreground mt-8">
            No FAQs available at the moment.
          </p>
        )}
      </div>
    </div>
  );
};

export default FAQs;
