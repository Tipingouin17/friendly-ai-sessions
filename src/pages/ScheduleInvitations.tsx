import { useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CalendarClock, Mail, Plus, Send, ShieldCheck, Users } from "lucide-react";
import { Turnstile } from "@marsidev/react-turnstile";

import PageHead from "@/components/PageHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import api from "@/lib/api";
import { createSessionInvitations, getScheduledStartIso } from "@/services/facilitatorService";
import { useSecureNavigation } from "@/hooks/useSecureNavigation";

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string;

type InviteeDraft = { name: string; email: string };

const formatScheduledTime = (iso?: string | null) => {
  if (!iso) return "Not scheduled";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(iso));
};

const ScheduleInvitations = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { navigateToHostSession } = useSecureNavigation();
  const conversationId = Number(searchParams.get("id"));
  const [invitees, setInvitees] = useState<InviteeDraft[]>([{ name: "", email: "" }]);
  const [emailSubject, setEmailSubject] = useState("You're invited to an AI-facilitated session");
  const [emailBody, setEmailBody] = useState("Hello,\n\nYou are invited to join our upcoming facilitated session. Please use the secure link when it is time to join.\n\nSee you there.");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileUnavailable, setTurnstileUnavailable] = useState(false);
  const turnstileRef = useRef<{ reset: () => void } | null>(null);

  const { data: conversation, isLoading } = useQuery({
    queryKey: ["scheduled-conversation", conversationId],
    queryFn: async () => {
      const { data, error } = await api
        .from("conversations")
        .select(`*, sessions!conversations_sessions_id_fkey (title, objective)`)
        .eq("id", conversationId)
        .single();
      if (error) throw error;
      return data as Record<string, unknown>;
    },
    enabled: Number.isFinite(conversationId) && conversationId > 0,
  });

  const scheduledStartIso = useMemo(() => getScheduledStartIso(conversation?.flow_config), [conversation]);
  const participantCapacity = Number(conversation?.participants ?? 1) - 1;
  const sessionTitle = ((conversation?.sessions as { title?: string | null } | undefined)?.title || "Scheduled session") as string;
  const validInvitees = invitees
    .map((invitee) => ({ name: invitee.name.trim(), email: invitee.email.trim().toLowerCase() }))
    .filter((invitee) => invitee.name && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invitee.email));

  const updateInvitee = (index: number, field: keyof InviteeDraft, value: string) => {
    setInvitees((current) => current.map((invitee, i) => (i === index ? { ...invitee, [field]: value } : invitee)));
  };

  const addInvitee = () => setInvitees((current) => [...current, { name: "", email: "" }]);

  const handleSubmit = async () => {
    if (!conversationId || !Number.isFinite(conversationId)) return;
    if (validInvitees.length === 0) {
      toast({ title: "Add at least one participant", description: "Each invitation needs a name and a valid email address.", variant: "destructive" });
      return;
    }
    if (TURNSTILE_SITE_KEY && !turnstileToken) {
      toast({
        title: turnstileUnavailable ? "Verification unavailable" : "Saving without email handoff",
        description: turnstileUnavailable
          ? "The verification widget could not connect, so invitations will be saved and the waiting area will open without sending emails."
          : "Complete verification to send emails automatically, or continue to save the roster and open the waiting area.",
      });
    }

    setIsSubmitting(true);
    try {
      await createSessionInvitations({
        conversationId,
        invitees: validInvitees,
        emailSubject,
        emailBody,
        cfTurnstileToken: turnstileToken,
      });
      toast({
        title: turnstileToken ? "Invitations prepared" : "Invitations saved",
        description: turnstileToken
          ? "Participants were saved on the scheduled session, and the email handoff was requested."
          : "Participants were saved on the scheduled session. Email handoff was skipped because verification was unavailable.",
      });
      await navigateToHostSession(conversationId);
    } catch (error) {
      console.error("Error saving invitations:", error);
      toast({ title: "Could not prepare invitations", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
      turnstileRef.current?.reset();
      setTurnstileToken(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!conversationId || !Number.isFinite(conversationId)) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 pt-28">
        <PageHead title="Schedule Invitations | AIfacilitator" description="Draft participant invitations" />
        <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-slate-950">Missing scheduled session</h1>
          <p className="mt-2 text-slate-500">Return to the facilitator wizard and create a scheduled session first.</p>
          <Button className="mt-6" onClick={() => navigate("/AIfacilitators")}>Back to facilitators</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 pb-12 pt-24">
      <PageHead title="Schedule Invitations | AIfacilitator" description="Draft and send invitations for a scheduled session" />
      <main className="mx-auto max-w-4xl">
        <button type="button" onClick={() => navigate("/AIfacilitators")} className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-indigo-700 hover:text-indigo-900">
          <ArrowLeft className="h-4 w-4" /> Back to facilitators
        </button>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-indigo-700">
                <CalendarClock className="h-3.5 w-3.5" /> Scheduled session
              </p>
              <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">Draft participant invitations</h1>
              <p className="mt-2 max-w-2xl text-slate-500">Prepare the invite list and message now, then move into the waiting area where you can monitor confirmed and joined participants before starting.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <p className="font-semibold text-slate-950">{isLoading ? "Loading session…" : sessionTitle}</p>
              <p className="mt-1">{formatScheduledTime(scheduledStartIso)}</p>
              <p className="mt-1">Capacity: {Math.max(participantCapacity, 0)} invited participant{participantCapacity === 1 ? "" : "s"}</p>
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-950"><Users className="h-5 w-5 text-indigo-600" /> Invitees</h2>
                <Button type="button" variant="outline" size="sm" onClick={addInvitee}><Plus className="mr-2 h-4 w-4" /> Add participant</Button>
              </div>
              <div className="space-y-3">
                {invitees.map((invitee, index) => (
                  <div key={index} className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2">
                    <Input placeholder="Participant name" value={invitee.name} onChange={(e) => updateInvitee(index, "name", e.target.value)} />
                    <Input type="email" placeholder="email@example.com" value={invitee.email} onChange={(e) => updateInvitee(index, "email", e.target.value)} />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-950"><Mail className="h-5 w-5 text-indigo-600" /> Message draft</h2>
              <Input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} placeholder="Email subject" />
              <Textarea className="min-h-[170px]" value={emailBody} onChange={(e) => setEmailBody(e.target.value)} placeholder="Invitation message" />
              {TURNSTILE_SITE_KEY && (
                <div className="rounded-2xl border border-slate-200 bg-white p-3">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700"><ShieldCheck className="h-4 w-4 text-emerald-600" /> Verification</div>
                  <Turnstile
                    ref={turnstileRef}
                    siteKey={TURNSTILE_SITE_KEY}
                    onSuccess={(token) => {
                      setTurnstileToken(token);
                      setTurnstileUnavailable(false);
                    }}
                    onExpire={() => setTurnstileToken(null)}
                    onError={() => {
                      setTurnstileToken(null);
                      setTurnstileUnavailable(true);
                    }}
                    options={{ theme: "light" }}
                  />
                  {turnstileUnavailable && (
                    <p className="mt-2 text-xs text-amber-700">
                      Verification is currently unavailable. You can still save the invite roster and open the waiting area; automatic email sending will be skipped.
                    </p>
                  )}
                </div>
              )}
              <Button type="button" className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={isSubmitting || validInvitees.length === 0} onClick={handleSubmit}>
                {isSubmitting ? "Preparing invitations…" : turnstileToken ? "Send invitations and open waiting area" : "Save invitations and open waiting area"}
                {!isSubmitting && <Send className="ml-2 h-4 w-4" />}
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default ScheduleInvitations;
