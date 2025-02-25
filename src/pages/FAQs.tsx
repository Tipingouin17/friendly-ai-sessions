
import { ChevronDown } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQs = () => {
  const faqs = [
    {
      question: "What is AI Facilitation?",
      answer: "AI Facilitation combines artificial intelligence with traditional facilitation methods to provide personalized guidance and support. Our AI facilitators are designed to understand your unique needs and adapt their approach accordingly."
    },
    {
      question: "How does the free trial work?",
      answer: "You can start your free trial immediately without any credit card required. This gives you full access to our AI facilitation platform for a limited time, allowing you to experience the benefits firsthand."
    },
    {
      question: "Is my data secure?",
      answer: "Yes, we take data security very seriously. All communications with our AI facilitators are encrypted, and we follow strict privacy protocols to ensure your information remains confidential."
    },
    {
      question: "Can I customize my AI facilitator?",
      answer: "Absolutely! Our AI facilitators can be customized to match your specific needs, preferences, and goals. You can adjust their communication style, focus areas, and more."
    },
    {
      question: "What types of sessions are available?",
      answer: "We offer a wide range of session types including personal development, business strategy, team facilitation, creative workshops, and more. Each type is tailored to achieve specific outcomes."
    }
  ];

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-4xl font-bold text-center mb-8">Frequently Asked Questions</h1>
        <p className="text-lg text-muted-foreground text-center mb-12">
          Find answers to common questions about our AI facilitation platform
        </p>
        
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`}>
              <AccordionTrigger className="text-left">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent>
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
};

export default FAQs;
