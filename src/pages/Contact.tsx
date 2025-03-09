import { Mail, MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
interface ContactFormData {
  fname: string;
  lname: string;
  email: string;
  message: string;
}
const ContactCard = ({
  icon: Icon,
  title,
  content
}: {
  icon: React.ElementType;
  title: string;
  content: string;
}) => <div className="glass-card p-6 rounded-xl">
    <div className="flex items-center gap-4">
      <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="text-muted-foreground">{content}</p>
      </div>
    </div>
  </div>;
const ContactForm = ({
  formData,
  isSubmitting,
  onChange,
  onSubmit
}: {
  formData: ContactFormData;
  isSubmitting: boolean;
  onChange: (field: keyof ContactFormData, value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}) => <form onSubmit={onSubmit} className="space-y-6">
    <div className="space-y-4">
      <Input type="text" placeholder="First Name" value={formData.fname} onChange={e => onChange('fname', e.target.value)} required />
      <Input type="text" placeholder="Last Name" value={formData.lname} onChange={e => onChange('lname', e.target.value)} required />
      <Input type="email" placeholder="Your Email" value={formData.email} onChange={e => onChange('email', e.target.value)} required />
      <Textarea placeholder="Your Message" className="min-h-[150px]" value={formData.message} onChange={e => onChange('message', e.target.value)} required />
    </div>
    <Button type="submit" className="w-full" disabled={isSubmitting}>
      {isSubmitting ? "Sending..." : "Send Message"}
    </Button>
  </form>;
const Contact = () => {
  const [formData, setFormData] = useState<ContactFormData>({
    fname: "",
    lname: "",
    email: "",
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const handleFormChange = (field: keyof ContactFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const {
        error
      } = await supabase.from('contact_form').insert([{
        ...formData,
        responded: false
      }]);
      if (error) throw error;
      toast({
        title: "Message sent successfully",
        description: "We'll get back to you as soon as possible."
      });
      setFormData({
        fname: "",
        lname: "",
        email: "",
        message: ""
      });
    } catch (error) {
      console.error('Error submitting form:', error);
      toast({
        title: "Error sending message",
        description: "Please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  return <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-4xl font-bold text-center mb-4">Contact Us</h1>
        <p className="text-lg text-muted-foreground text-center mb-12">
          Have questions? We'd love to hear from you.
        </p>

        <div className="grid md:grid-cols-2 gap-12">
          <div className="space-y-8">
            <ContactCard icon={Mail} title="Email" content="support@aifacilitator.com" />
            <ContactCard icon={Phone} title="Phone" content="+1 (555) 123-4567" />
            <ContactCard icon={MapPin} title="Location" content="123 Innovation Drive, Tech City, TC 12345" />
          </div>

          <Card className="p-8 bg-white">
            <ContactForm formData={formData} isSubmitting={isSubmitting} onChange={handleFormChange} onSubmit={handleSubmit} />
          </Card>
        </div>
      </div>
    </div>;
};
export default Contact;