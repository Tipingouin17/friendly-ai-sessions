import { Mail, MapPin, Clock, ArrowRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageHead from "@/components/PageHead";

interface ContactFormData {
  fname: string;
  lname: string;
  email: string;
  message: string;
}

const Contact = () => {
  const [formData, setFormData] = useState<ContactFormData>({
    fname: "",
    lname: "",
    email: "",
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleFormChange = (field: keyof ContactFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('contact_form')
        .insert([{ ...formData, responded: false }]);

      if (error) throw error;

      setSubmitted(true);
      toast({
        title: "Message sent!",
        description: "We'll get back to you within 24 hours.",
      });

      setFormData({ fname: "", lname: "", email: "", message: "" });
    } catch (error) {
      console.error('Error submitting form:', error);
      toast({
        title: "Error sending message",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <PageHead title="Contact Us | MyFacilitator" description="Get in touch with the MyFacilitator team" />

      {/* Hero */}
      <div className="bg-gradient-to-b from-indigo-50 to-white pt-28 pb-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <span className="inline-flex items-center gap-2 mb-4 px-4 py-1.5 rounded-full bg-indigo-100 text-indigo-700 text-sm font-semibold border border-indigo-200">
            <Zap className="h-3.5 w-3.5" />
            Get in Touch
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 text-center">
            We'd love to hear from you
          </h1>
          <p className="text-lg text-gray-500 text-center">
            Have a question, feedback, or want to explore enterprise options? Our team responds within 24 hours.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 pb-24">
        <div className="grid md:grid-cols-5 gap-12 items-start">

          {/* Left: Contact info */}
          <div className="md:col-span-2 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-6">Contact information</h2>
              <div className="space-y-4">
                {[
                  {
                    icon: <Mail className="h-5 w-5 text-indigo-600" />,
                    bg: 'bg-indigo-50',
                    title: 'Email us',
                    content: 'support@myfacilitator.ai',
                    sub: 'We reply within 24 hours',
                  },
                  {
                    icon: <Clock className="h-5 w-5 text-violet-600" />,
                    bg: 'bg-violet-50',
                    title: 'Business hours',
                    content: 'Mon – Fri, 9am – 6pm CET',
                    sub: 'Urgent? Use the form anytime',
                  },
                  {
                    icon: <MapPin className="h-5 w-5 text-blue-600" />,
                    bg: 'bg-blue-50',
                    title: 'Headquarters',
                    content: 'Europe',
                    sub: 'Remote-first team',
                  },
                ].map(({ icon, bg, title, content, sub }) => (
                  <div key={title} className="flex gap-4 items-start rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                    <div className={`flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl ${bg}`}>
                      {icon}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 text-sm">{title}</div>
                      <div className="text-gray-700 text-sm mt-0.5">{content}</div>
                      <div className="text-gray-400 text-xs mt-0.5">{sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Enterprise CTA */}
            <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 p-6 text-white">
              <h3 className="font-bold text-lg mb-2">Looking for Enterprise?</h3>
              <p className="text-indigo-200 text-sm mb-4">
                Custom pricing, dedicated support, and white-label options for large organisations.
              </p>
              <a
                href="mailto:enterprise@myfacilitator.ai"
                className="inline-flex items-center gap-2 text-sm font-semibold text-white hover:text-indigo-200 transition-colors"
              >
                Talk to our team <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Right: Form */}
          <div className="md:col-span-3">
            <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Send us a message</h2>

              {submitted ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100 mb-4">
                    <Mail className="h-8 w-8 text-indigo-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Message sent!</h3>
                  <p className="text-gray-500 text-sm">
                    Thank you for reaching out. We'll get back to you within 24 hours.
                  </p>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="mt-6 text-sm text-indigo-600 hover:underline"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-gray-700">First Name</label>
                      <Input
                        type="text"
                        placeholder="Jane"
                        value={formData.fname}
                        onChange={(e) => handleFormChange('fname', e.target.value)}
                        required
                        className="rounded-xl border-gray-200 focus:border-indigo-400 focus:ring-indigo-400"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-gray-700">Last Name</label>
                      <Input
                        type="text"
                        placeholder="Smith"
                        value={formData.lname}
                        onChange={(e) => handleFormChange('lname', e.target.value)}
                        required
                        className="rounded-xl border-gray-200 focus:border-indigo-400 focus:ring-indigo-400"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">Email address</label>
                    <Input
                      type="email"
                      placeholder="jane@company.com"
                      value={formData.email}
                      onChange={(e) => handleFormChange('email', e.target.value)}
                      required
                      className="rounded-xl border-gray-200 focus:border-indigo-400 focus:ring-indigo-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">Message</label>
                    <Textarea
                      placeholder="Tell us how we can help..."
                      className="min-h-[140px] rounded-xl border-gray-200 focus:border-indigo-400 focus:ring-indigo-400 resize-none"
                      value={formData.message}
                      onChange={(e) => handleFormChange('message', e.target.value)}
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-700 rounded-xl py-5 font-semibold shadow-sm shadow-indigo-500/20 transition-all"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Sending..." : "Send Message"}
                    {!isSubmitting && <ArrowRight className="ml-2 h-4 w-4" />}
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
