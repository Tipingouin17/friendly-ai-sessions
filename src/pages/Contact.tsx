/**
 * Contact
 *
 * Page for the AIfacilitator application.
 * Anti-spam measures:
 *  - HTML5 required + pattern validation on all fields
 *  - Minimum message length (20 chars)
 *  - Honeypot hidden field (bots fill it, humans don't)
 *  - Frontend rate-limiting (max 3 submissions per 10 minutes)
 *  - Optional Cloudflare Turnstile CAPTCHA (when VITE_TURNSTILE_SITE_KEY is set)
 * Contact info (email, hours, address) is loaded dynamically from the DB
 * and can be edited from the Admin > Settings panel.
 */
import { Mail, MapPin, Clock, ArrowRight, Zap, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { useState, useRef, useEffect } from "react";
import { Turnstile } from "@marsidev/react-turnstile";
import api from "@/lib/api";
import PageHead from "@/components/PageHead";
import { trackContactLead } from "@/lib/tracking";

interface ContactFormData {
  fname: string;
  lname: string;
  email: string;
  message: string;
}

interface ContactInfo {
  contact_email: string;
  business_hours: string;
  contact_address: string;
}

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;
const MIN_MESSAGE_LENGTH = 20;
const MAX_SUBMISSIONS_PER_WINDOW = 3;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

const DEFAULT_CONTACT_INFO: ContactInfo = {
  contact_email: "support@aifacilitator.ai",
  business_hours: "Mon – Fri, 9am – 6pm CET",
  contact_address: "Europe",
};

// Simple email regex (RFC 5322 simplified)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const Contact = () => {
  const [formData, setFormData] = useState<ContactFormData>({
    fname: "",
    lname: "",
    email: "",
    message: ""
  });
  // Honeypot field — should remain empty for real users
  const [honeypot, setHoneypot] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<ContactFormData>>({});
  const turnstileRef = useRef<{ reset: () => void } | null>(null);
  const confirmationRef = useRef<HTMLDivElement | null>(null);
  const [contactInfo, setContactInfo] = useState<ContactInfo>(DEFAULT_CONTACT_INFO);

  // Load contact info from DB (configurations table)
  useEffect(() => {
    const fetchContactInfo = async () => {
      try {
        const { data, error } = await api
          .from("configurations")
          .select("contact_email, business_hours, contact_address")
          .limit(1)
          .single();
        if (!error && data) {
          setContactInfo({
            contact_email: (data as ContactInfo).contact_email || DEFAULT_CONTACT_INFO.contact_email,
            business_hours: (data as ContactInfo).business_hours || DEFAULT_CONTACT_INFO.business_hours,
            contact_address: (data as ContactInfo).contact_address || DEFAULT_CONTACT_INFO.contact_address,
          });
        }
      } catch {
        // Silently fall back to defaults
      }
    };
    fetchContactInfo();
  }, []);

  useEffect(() => {
    if (submitted) {
      confirmationRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [submitted]);

  const resetContactForm = () => {
    setFormData({ fname: "", lname: "", email: "", message: "" });
    setFieldErrors({});
    setHoneypot("");
    setTurnstileToken(null);
    turnstileRef.current?.reset();
  };

  const handleFormChange = (field: keyof ContactFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear field error on change
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const errors: Partial<ContactFormData> = {};

    if (!formData.fname.trim() || formData.fname.trim().length < 2) {
      errors.fname = "First name must be at least 2 characters.";
    }
    if (!formData.lname.trim() || formData.lname.trim().length < 2) {
      errors.lname = "Last name must be at least 2 characters.";
    }
    if (!formData.email.trim() || !EMAIL_REGEX.test(formData.email.trim())) {
      errors.email = "Please enter a valid email address.";
    }
    if (!formData.message.trim() || formData.message.trim().length < MIN_MESSAGE_LENGTH) {
      errors.message = `Message must be at least ${MIN_MESSAGE_LENGTH} characters.`;
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const getRecentSuccessfulSubmissions = (): number[] => {
    const key = "contact_successful_submissions";
    const raw = localStorage.getItem(key);
    const now = Date.now();
    const submissions: number[] = raw ? JSON.parse(raw) : [];
    const recentSubmissions = submissions.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);
    localStorage.setItem(key, JSON.stringify(recentSubmissions));
    return recentSubmissions;
  };

  const checkRateLimit = (): boolean => {
    const submissions = getRecentSuccessfulSubmissions();
    const now = Date.now();

    if (submissions.length >= MAX_SUBMISSIONS_PER_WINDOW) {
      const waitMinutes = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - submissions[0])) / 60000);
      toast({
        title: "Too many submissions",
        description: `Please wait ${waitMinutes} minute${waitMinutes > 1 ? 's' : ''} before sending another message.`,
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const recordSuccessfulSubmission = () => {
    const key = "contact_successful_submissions";
    localStorage.setItem(key, JSON.stringify([...getRecentSuccessfulSubmissions(), Date.now()]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Honeypot check — if filled, silently discard (bot detected)
    if (honeypot) {
      setSubmitted(true);
      return;
    }

    // Frontend validation
    if (!validateForm()) {
      toast({
        title: "Please fix the errors below",
        description: "Some fields need your attention before submitting.",
        variant: "destructive",
      });
      return;
    }

    // Rate limiting
    if (!checkRateLimit()) return;

    // Turnstile check — only block if configured AND token is missing
    if (TURNSTILE_SITE_KEY && !turnstileToken) {
      toast({
        title: "Verification required",
        description: "Please complete the CAPTCHA verification before submitting.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const body: Record<string, string> = { ...formData };
      if (turnstileToken) {
        body.cf_turnstile_token = turnstileToken;
      }

      const { data, error } = await api.functions.invoke<{ success: boolean; message: string }>(
        "contact-form",
        { body }
      );

      if (error) {
        const errMsg =
          (error as { message?: string }).message ||
          "Please try again later.";
        throw new Error(errMsg);
      }

      resetContactForm();
      setSubmitted(true);
      recordSuccessfulSubmission();
      trackContactLead('contact_form_submit');
      toast({
        title: "Message sent!",
        description: data?.message ?? "We'll get back to you within 24 hours.",
      });
    } catch (err: unknown) {
      console.error("Error submitting contact form:", err);
      const errMessage =
        err instanceof Error ? err.message : "Please try again later.";
      toast({
        title: "Error sending message",
        description: errMessage,
        variant: "destructive",
      });
      // Reset Turnstile so user can try again
      turnstileRef.current?.reset();
      setTurnstileToken(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <PageHead title="Contact Us | AIfacilitator" description="Get in touch with the AIfacilitator team" />

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
                    content: contactInfo.contact_email,
                    sub: 'We reply within 24 hours',
                  },
                  {
                    icon: <Clock className="h-5 w-5 text-violet-600" />,
                    bg: 'bg-violet-50',
                    title: 'Business hours',
                    content: contactInfo.business_hours,
                    sub: 'Urgent? Use the form anytime',
                  },
                  {
                    icon: <MapPin className="h-5 w-5 text-blue-600" />,
                    bg: 'bg-blue-50',
                    title: 'Headquarters',
                    content: contactInfo.contact_address,
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
                href={`mailto:enterprise@aifacilitator.ai`}
                className="inline-flex items-center gap-2 text-sm font-semibold text-white hover:text-indigo-200 transition-colors"
              >
                Talk to our team <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Right: Form */}
          <div className="md:col-span-3">
            <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-1">Send us a message</h2>
              <p className="text-sm text-gray-400 mb-6">
                Fields marked <span className="text-red-500 font-semibold">*</span> are required.
              </p>

              {submitted ? (
                <div
                  ref={confirmationRef}
                  role="status"
                  aria-live="polite"
                  className="text-center py-12 rounded-2xl border border-green-100 bg-green-50/60 px-6"
                >
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Message sent successfully</h3>
                  <p className="text-gray-600 text-sm max-w-md mx-auto">
                    Thank you for reaching out. Your message has been received and our team will get back to you within 24 hours.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      resetContactForm();
                      setSubmitted(false);
                    }}
                    className="mt-6 text-sm font-semibold text-indigo-600 hover:underline"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5" noValidate>

                  {/* Honeypot — hidden from real users, bots fill it */}
                  <input
                    type="text"
                    name="website"
                    value={honeypot}
                    onChange={e => setHoneypot(e.target.value)}
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                    style={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0, width: 0 }}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-gray-700">
                        First Name <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="text"
                        placeholder="Jane"
                        value={formData.fname}
                        onChange={(e) => handleFormChange('fname', e.target.value)}
                        minLength={2}
                        required
                        className={`rounded-xl border-gray-200 focus:border-indigo-400 focus:ring-indigo-400 ${fieldErrors.fname ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : ''}`}
                      />
                      {fieldErrors.fname && (
                        <p className="text-xs text-red-500 mt-1">{fieldErrors.fname}</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-gray-700">
                        Last Name <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="text"
                        placeholder="Smith"
                        value={formData.lname}
                        onChange={(e) => handleFormChange('lname', e.target.value)}
                        minLength={2}
                        required
                        className={`rounded-xl border-gray-200 focus:border-indigo-400 focus:ring-indigo-400 ${fieldErrors.lname ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : ''}`}
                      />
                      {fieldErrors.lname && (
                        <p className="text-xs text-red-500 mt-1">{fieldErrors.lname}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">
                      Email address <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="email"
                      placeholder="jane@company.com"
                      value={formData.email}
                      onChange={(e) => handleFormChange('email', e.target.value)}
                      required
                      className={`rounded-xl border-gray-200 focus:border-indigo-400 focus:ring-indigo-400 ${fieldErrors.email ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : ''}`}
                    />
                    {fieldErrors.email && (
                      <p className="text-xs text-red-500 mt-1">{fieldErrors.email}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">
                      Message <span className="text-red-500">*</span>
                      <span className="text-gray-400 font-normal ml-2 text-xs">(min. {MIN_MESSAGE_LENGTH} characters)</span>
                    </label>
                    <Textarea
                      placeholder="Tell us how we can help..."
                      className={`min-h-[140px] rounded-xl border-gray-200 focus:border-indigo-400 focus:ring-indigo-400 resize-none ${fieldErrors.message ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : ''}`}
                      value={formData.message}
                      onChange={(e) => handleFormChange('message', e.target.value)}
                      minLength={MIN_MESSAGE_LENGTH}
                      required
                    />
                    <div className="flex justify-between items-center">
                      {fieldErrors.message ? (
                        <p className="text-xs text-red-500">{fieldErrors.message}</p>
                      ) : (
                        <span />
                      )}
                      <span className={`text-xs ml-auto ${formData.message.length < MIN_MESSAGE_LENGTH ? 'text-gray-400' : 'text-green-500'}`}>
                        {formData.message.length}/{MIN_MESSAGE_LENGTH} min
                      </span>
                    </div>
                  </div>

                  {/* Cloudflare Turnstile widget — only shown when VITE_TURNSTILE_SITE_KEY is set */}
                  {TURNSTILE_SITE_KEY && (
                    <div className="flex justify-start">
                      <Turnstile
                        ref={turnstileRef}
                        siteKey={TURNSTILE_SITE_KEY}
                        onSuccess={(token) => setTurnstileToken(token)}
                        onExpire={() => setTurnstileToken(null)}
                        onError={() => setTurnstileToken(null)}
                        options={{ theme: "light" }}
                      />
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-700 rounded-xl py-5 font-semibold shadow-sm shadow-indigo-500/20 transition-all"
                    disabled={isSubmitting || (!!TURNSTILE_SITE_KEY && !turnstileToken)}
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
