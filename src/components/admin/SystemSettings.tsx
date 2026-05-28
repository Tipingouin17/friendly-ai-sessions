/**
 * System Settings — Admin Component
 * Manages the single-row `configurations` table:
 * default_gpt_token, default_currency, google_capcha_key,
 * secret_message, free_plan_message_limit, languages.
 */
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    Settings, Bot, Globe, Shield, MessageSquare, Save, Loader2, RefreshCw, Eye, EyeOff, Mic, Volume2, Activity,
} from "lucide-react";

interface Config {
    id: number;
    default_gpt_token: string | null;
    default_ai_model: string | null;
    default_currency: string;
    google_capcha_key: string | null;
    secret_message: string | null;
    free_plan_message_limit: number | null;
    toolbox_token_accounting_enabled: boolean;
    toolbox_default_token_budget: number;
    toolbox_overage_policy: string;
    speech_stack_enabled: boolean;
    speech_default_language: string;
    tts_avatar_enabled: boolean;
    tts_default_voice_id: string | null;
    tts_lip_sync_enabled: boolean;
    facilitation_analytics_enabled: boolean;
    languages: Record<string, boolean> | null;
    contact_email: string | null;
    business_hours: string | null;
    contact_address: string | null;
}

const AI_MODEL_OPTIONS = [
    { value: "gpt-4.1-nano",     label: "GPT-4.1 Nano — Ultra-cheap, Free tier ($0.10/$0.40 per 1M)" },
    { value: "gpt-4.1-mini",     label: "GPT-4.1 Mini — Recommended: Starter/Premium ($0.40/$1.60 per 1M) ★" },
    { value: "gpt-4.1",          label: "GPT-4.1 — Highest quality, Enterprise ($2.00/$8.00 per 1M)" },
    { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash — Google, ultra-fast reasoning ($0.15/$0.60 per 1M)" },
];

const CURRENCIES = [
    { value: "USD", label: "USD — US Dollar" },
    { value: "EUR", label: "EUR — Euro" },
    { value: "GBP", label: "GBP — British Pound" },
    { value: "CAD", label: "CAD — Canadian Dollar" },
    { value: "AUD", label: "AUD — Australian Dollar" },
    { value: "CHF", label: "CHF — Swiss Franc" },
    { value: "JPY", label: "JPY — Japanese Yen" },
];

const SUPPORTED_LANGUAGES = [
    { code: "en", label: "English" },
    { code: "fr", label: "French" },
    { code: "es", label: "Spanish" },
    { code: "de", label: "German" },
    { code: "it", label: "Italian" },
    { code: "pt", label: "Portuguese" },
    { code: "nl", label: "Dutch" },
    { code: "ar", label: "Arabic" },
    { code: "zh", label: "Chinese" },
    { code: "ja", label: "Japanese" },
];

const SECTIONS = [
    { id: "ai", label: "AI Configuration", icon: Bot, color: "purple" },
    { id: "platform", label: "Platform", icon: Globe, color: "blue" },
    { id: "security", label: "Security", icon: Shield, color: "red" },
    { id: "messaging", label: "Messaging", icon: MessageSquare, color: "green" },
    { id: "contact", label: "Contact Info", icon: Mail, color: "indigo" },
    { id: "voice", label: "Speech & Avatar", icon: Mic, color: "indigo" },
];

export const SystemSettings = () => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [activeSection, setActiveSection] = useState("ai");
    const [isDirty, setIsDirty] = useState(false);
    const [showToken, setShowToken] = useState(false);
    const [showCaptcha, setShowCaptcha] = useState(false);

    const [form, setForm] = useState<Partial<Config>>({
        default_gpt_token: "",
        default_ai_model: "gpt-4.1-mini",
        default_currency: "USD",
        google_capcha_key: "",
        secret_message: "",
        free_plan_message_limit: 20,
        toolbox_token_accounting_enabled: true,
        toolbox_default_token_budget: 6000,
        toolbox_overage_policy: "warn",
        speech_stack_enabled: true,
        speech_default_language: "en-US",
        tts_avatar_enabled: true,
        tts_default_voice_id: "",
        tts_lip_sync_enabled: true,
        facilitation_analytics_enabled: true,
        languages: { en: true },
        contact_email: "support@aifacilitator.ai",
        business_hours: "Mon - Fri, 9am - 6pm CET",
        contact_address: "Europe",
    });

    const { data: config, isLoading, refetch } = useQuery({
        queryKey: ["admin-system-config"],
        queryFn: async () => {
            const { data, error } = await api
                .from("configurations")
                .select("*")
                .limit(1)
                .single();
            if (error) throw error;
            return data as Config;
        },
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
    });

    useEffect(() => {
        if (config) {
            setForm({
                default_gpt_token: config.default_gpt_token ?? "",
                default_ai_model: config.default_ai_model ?? "gpt-4.1-mini",
                default_currency: config.default_currency ?? "USD",
                google_capcha_key: config.google_capcha_key ?? "",
                secret_message: config.secret_message ?? "",
                free_plan_message_limit: config.free_plan_message_limit ?? 20,
                toolbox_token_accounting_enabled: config.toolbox_token_accounting_enabled ?? true,
                toolbox_default_token_budget: config.toolbox_default_token_budget ?? 6000,
                toolbox_overage_policy: config.toolbox_overage_policy ?? "warn",
                speech_stack_enabled: config.speech_stack_enabled ?? true,
                speech_default_language: config.speech_default_language ?? "en-US",
                tts_avatar_enabled: config.tts_avatar_enabled ?? true,
                tts_default_voice_id: config.tts_default_voice_id ?? "",
                tts_lip_sync_enabled: config.tts_lip_sync_enabled ?? true,
                facilitation_analytics_enabled: config.facilitation_analytics_enabled ?? true,
                languages: (config.languages as Record<string, boolean>) ?? { en: true },
                contact_email: config.contact_email ?? "support@aifacilitator.ai",
                business_hours: config.business_hours ?? "Mon - Fri, 9am - 6pm CET",
                contact_address: config.contact_address ?? "Europe",
            });
            setIsDirty(false);
        }
    }, [config]);

    const saveMutation = useMutation({
        mutationFn: async () => {
            if (!config) throw new Error("No configuration record found.");
            const { error } = await api
                .from("configurations")
                .update({
                    default_gpt_token: form.default_gpt_token || null,
                    default_ai_model: form.default_ai_model || "gpt-4.1-mini",
                    default_currency: form.default_currency ?? "USD",
                    google_capcha_key: form.google_capcha_key || null,
                    secret_message: form.secret_message || null,
                    free_plan_message_limit: form.free_plan_message_limit ?? 20,
                    toolbox_token_accounting_enabled: form.toolbox_token_accounting_enabled ?? true,
                    toolbox_default_token_budget: Number(form.toolbox_default_token_budget ?? 6000),
                    toolbox_overage_policy: form.toolbox_overage_policy ?? "warn",
                    speech_stack_enabled: form.speech_stack_enabled ?? true,
                    speech_default_language: form.speech_default_language || "en-US",
                    tts_avatar_enabled: form.tts_avatar_enabled ?? true,
                    tts_default_voice_id: form.tts_default_voice_id || null,
                    tts_lip_sync_enabled: form.tts_lip_sync_enabled ?? true,
                    facilitation_analytics_enabled: form.facilitation_analytics_enabled ?? true,
                    languages: form.languages ?? { en: true },
                contact_email: form.contact_email || "support@aifacilitator.ai",
                business_hours: form.business_hours || "Mon - Fri, 9am - 6pm CET",
                contact_address: form.contact_address || "Europe",
                })
                .eq("id", config.id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-system-config"] });
            toast({ title: "Settings saved", description: "Configuration updated successfully." });
            setIsDirty(false);
        },
        onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });

    const handleChange = (key: keyof Config, value: unknown) => {
        setForm(f => ({ ...f, [key]: value }));
        setIsDirty(true);
    };

    const toggleLanguage = (code: string) => {
        const current = (form.languages ?? {}) as Record<string, boolean>;
        const updated = { ...current, [code]: !current[code] };
        handleChange("languages", updated);
    };

    const colorMap: Record<string, string> = {
        purple: "bg-purple-100 text-purple-600",
        blue: "bg-blue-100 text-blue-600",
        red: "bg-red-100 text-red-600",
        green: "bg-green-100 text-green-600",
        indigo: "bg-indigo-100 text-indigo-600",
    };

    return (
        <div className="space-y-6">
            <Card className="border-purple-200 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-t-lg">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 rounded-lg">
                                <Settings className="h-6 w-6 text-purple-600" />
                            </div>
                            <div>
                                <CardTitle className="text-xl">System Settings</CardTitle>
                                <CardDescription>Configure AI tokens, currency, security keys, and language support</CardDescription>
                            </div>
                        </div>
                        <div className="flex gap-2 items-center">
                            <Button variant="outline" size="sm" onClick={() => refetch()}>
                                <RefreshCw className="h-4 w-4 mr-1" /> Refresh
                            </Button>
                            {isDirty && (
                                <Badge className="bg-amber-100 text-amber-800 border border-amber-200">
                                    Unsaved changes
                                </Badge>
                            )}
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="pt-5">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                        </div>
                    ) : (
                        <div className="flex flex-col lg:flex-row gap-6">
                            {/* Sidebar */}
                            <div className="lg:w-52 shrink-0">
                                <nav className="space-y-1">
                                    {SECTIONS.map(s => {
                                        const Icon = s.icon;
                                        const isActive = activeSection === s.id;
                                        return (
                                            <button
                                                key={s.id}
                                                onClick={() => setActiveSection(s.id)}
                                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                                                    isActive
                                                        ? "bg-purple-100 text-purple-800 shadow-sm"
                                                        : "text-gray-600 hover:bg-gray-100"
                                                }`}
                                            >
                                                <div className={`p-1.5 rounded-md ${isActive ? colorMap[s.color] : "bg-gray-100 text-gray-500"}`}>
                                                    <Icon className="h-3.5 w-3.5" />
                                                </div>
                                                {s.label}
                                            </button>
                                        );
                                    })}
                                </nav>
                            </div>

                            <Separator orientation="vertical" className="hidden lg:block" />

                            {/* Fields */}
                            <div className="flex-1 space-y-5">
                                {/* AI Configuration */}
                                {activeSection === "ai" && (
                                    <>
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className={`p-1.5 rounded-md ${colorMap.purple}`}>
                                                <Bot className="h-4 w-4" />
                                            </div>
                                            <h3 className="font-semibold text-gray-800">AI Configuration</h3>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="font-semibold">Platform Default AI Model</Label>
                                            <p className="text-xs text-gray-500">The AI model used for all sessions unless overridden per-session in Prompt Management</p>
                                            <Select
                                                value={form.default_ai_model ?? "gpt-4.1-mini"}
                                                onValueChange={v => handleChange("default_ai_model", v)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {AI_MODEL_OPTIONS.map(opt => (
                                                        <SelectItem key={opt.value} value={opt.value}>
                                                            {opt.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <Separator />
                                        <div className="space-y-1.5">
                                            <Label className="font-semibold">Default OpenAI API Token</Label>
                                            <p className="text-xs text-gray-500">Used as the fallback API key for all AI sessions</p>
                                            <div className="relative">
                                                <Input
                                                    type={showToken ? "text" : "password"}
                                                    value={form.default_gpt_token ?? ""}
                                                    onChange={e => handleChange("default_gpt_token", e.target.value)}
                                                    placeholder="sk-..."
                                                    className="pr-10 font-mono text-sm"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowToken(v => !v)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                                >
                                                    {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </button>
                                            </div>
                                        </div>
                                        <Separator />
                                        <div className="space-y-4 rounded-xl border border-purple-100 bg-purple-50/50 p-4">
                                            <div>
                                                <Label className="font-semibold">Toolbox token consumption</Label>
                                                <p className="text-xs text-gray-500">Controls how facilitator tool usage is accounted for after the new database-backed toolbox is enabled.</p>
                                            </div>
                                            <div className="flex items-center justify-between gap-4 rounded-lg bg-white p-3 border">
                                                <div>
                                                    <p className="text-sm font-medium text-gray-800">Enable per-tool token accounting</p>
                                                    <p className="text-xs text-gray-500">When enabled, each tool contributes its configured token cost to session economics.</p>
                                                </div>
                                                <Switch
                                                    checked={form.toolbox_token_accounting_enabled ?? true}
                                                    onCheckedChange={checked => handleChange("toolbox_token_accounting_enabled", checked)}
                                                />
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <Label>Default session tool budget</Label>
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        value={form.toolbox_default_token_budget ?? 6000}
                                                        onChange={e => handleChange("toolbox_default_token_budget", Number(e.target.value))}
                                                    />
                                                    <p className="text-xs text-gray-500">Fallback token budget used when a session has no stricter plan or prompt budget.</p>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label>Overage policy</Label>
                                                    <Select
                                                        value={form.toolbox_overage_policy ?? "warn"}
                                                        onValueChange={v => handleChange("toolbox_overage_policy", v)}
                                                    >
                                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="warn">Warn facilitator only</SelectItem>
                                                            <SelectItem value="soft_limit">Soft limit with throttling</SelectItem>
                                                            <SelectItem value="hard_limit">Hard stop at budget</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* Platform */}
                                {activeSection === "platform" && (
                                    <>
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className={`p-1.5 rounded-md ${colorMap.blue}`}>
                                                <Globe className="h-4 w-4" />
                                            </div>
                                            <h3 className="font-semibold text-gray-800">Platform Settings</h3>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="font-semibold">Default Currency</Label>
                                            <p className="text-xs text-gray-500">Currency used for plan pricing and billing</p>
                                            <Select
                                                value={form.default_currency ?? "USD"}
                                                onValueChange={v => handleChange("default_currency", v)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {CURRENCIES.map(c => (
                                                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <Separator />
                                        <div className="space-y-2">
                                            <Label className="font-semibold">Supported Languages</Label>
                                            <p className="text-xs text-gray-500">Languages available in the platform interface</p>
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {SUPPORTED_LANGUAGES.map(lang => {
                                                    const enabled = (form.languages as Record<string, boolean>)?.[lang.code] ?? false;
                                                    return (
                                                        <button
                                                            key={lang.code}
                                                            type="button"
                                                            onClick={() => toggleLanguage(lang.code)}
                                                            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                                                                enabled
                                                                    ? "bg-purple-100 text-purple-800 border-purple-300"
                                                                    : "bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300"
                                                            }`}
                                                        >
                                                            {lang.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* Security */}
                                {activeSection === "security" && (
                                    <>
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className={`p-1.5 rounded-md ${colorMap.red}`}>
                                                <Shield className="h-4 w-4" />
                                            </div>
                                            <h3 className="font-semibold text-gray-800">Security Keys</h3>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="font-semibold">Google reCAPTCHA Site Key</Label>
                                            <p className="text-xs text-gray-500">Used to protect sign-up and contact forms from bots</p>
                                            <div className="relative">
                                                <Input
                                                    type={showCaptcha ? "text" : "password"}
                                                    value={form.google_capcha_key ?? ""}
                                                    onChange={e => handleChange("google_capcha_key", e.target.value)}
                                                    placeholder="6Le..."
                                                    className="pr-10 font-mono text-sm"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowCaptcha(v => !v)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                                >
                                                    {showCaptcha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* Speech & Avatar */}
                                {activeSection === "voice" && (
                                    <>
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className={`p-1.5 rounded-md ${colorMap.indigo}`}>
                                                <Mic className="h-4 w-4" />
                                            </div>
                                            <h3 className="font-semibold text-gray-800">Speech, Avatar & Analytics</h3>
                                        </div>
                                        <div className="space-y-4 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
                                            <div className="flex items-center justify-between gap-4 rounded-lg bg-white p-3 border">
                                                <div>
                                                    <p className="text-sm font-medium text-gray-800">Enable browser speech stack</p>
                                                    <p className="text-xs text-gray-500">Allows participants to dictate responses and persist final speech turns for facilitation analytics.</p>
                                                </div>
                                                <Switch
                                                    checked={form.speech_stack_enabled ?? true}
                                                    onCheckedChange={checked => handleChange("speech_stack_enabled", checked)}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label>Default speech language</Label>
                                                <Input
                                                    value={form.speech_default_language ?? "en-US"}
                                                    onChange={e => handleChange("speech_default_language", e.target.value)}
                                                    placeholder="en-US"
                                                />
                                                <p className="text-xs text-gray-500">BCP-47 language code used by browser speech recognition unless a session overrides it.</p>
                                            </div>
                                            <Separator />
                                            <div className="flex items-center justify-between gap-4 rounded-lg bg-white p-3 border">
                                                <div className="flex items-start gap-3">
                                                    <Volume2 className="mt-0.5 h-4 w-4 text-indigo-500" />
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-800">Enable avatar TTS playback</p>
                                                        <p className="text-xs text-gray-500">Lets the AI facilitator speak browser-synthesized responses and emit avatar speaking states.</p>
                                                    </div>
                                                </div>
                                                <Switch
                                                    checked={form.tts_avatar_enabled ?? true}
                                                    onCheckedChange={checked => handleChange("tts_avatar_enabled", checked)}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label>Preferred TTS voice ID</Label>
                                                <Input
                                                    value={form.tts_default_voice_id ?? ""}
                                                    onChange={e => handleChange("tts_default_voice_id", e.target.value)}
                                                    placeholder="Browser voice name or provider voice id"
                                                />
                                            </div>
                                            <div className="flex items-center justify-between gap-4 rounded-lg bg-white p-3 border">
                                                <div>
                                                    <p className="text-sm font-medium text-gray-800">Enable lip-sync cues</p>
                                                    <p className="text-xs text-gray-500">Stores lightweight marker metadata for future embodied-avatar providers.</p>
                                                </div>
                                                <Switch
                                                    checked={form.tts_lip_sync_enabled ?? true}
                                                    onCheckedChange={checked => handleChange("tts_lip_sync_enabled", checked)}
                                                />
                                            </div>
                                            <div className="flex items-center justify-between gap-4 rounded-lg bg-white p-3 border">
                                                <div className="flex items-start gap-3">
                                                    <Activity className="mt-0.5 h-4 w-4 text-indigo-500" />
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-800">Enable facilitation analytics snapshots</p>
                                                        <p className="text-xs text-gray-500">Persists health, balance, coverage, topic-drift, speech, and TTS summary metrics.</p>
                                                    </div>
                                                </div>
                                                <Switch
                                                    checked={form.facilitation_analytics_enabled ?? true}
                                                    onCheckedChange={checked => handleChange("facilitation_analytics_enabled", checked)}
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}



                                {/* Contact Info */}
                                {activeSection === "contact" && (
                                    <>
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className={`p-1.5 rounded-md ${colorMap.indigo}`}>
                                                <Mail className="h-4 w-4" />
                                            </div>
                                            <h3 className="font-semibold text-gray-800">Contact Page Info</h3>
                                        </div>
                                        <p className="text-xs text-gray-500 -mt-3 mb-2">These values are displayed on the public /contact page.</p>
                                        <div className="space-y-1.5">
                                            <Label className="font-semibold">Contact Email</Label>
                                            <p className="text-xs text-gray-500">Email address shown on the contact page and used as fallback recipient</p>
                                            <Input
                                                type="email"
                                                value={form.contact_email ?? ""}
                                                onChange={e => handleChange("contact_email", e.target.value)}
                                                placeholder="support@aifacilitator.ai"
                                            />
                                        </div>
                                        <Separator />
                                        <div className="space-y-1.5">
                                            <Label className="font-semibold">Business Hours</Label>
                                            <p className="text-xs text-gray-500">Displayed in the contact info block (e.g. Mon – Fri, 9am – 6pm CET)</p>
                                            <Input
                                                type="text"
                                                value={form.business_hours ?? ""}
                                                onChange={e => handleChange("business_hours", e.target.value)}
                                                placeholder="Mon – Fri, 9am – 6pm CET"
                                            />
                                        </div>
                                        <Separator />
                                        <div className="space-y-1.5">
                                            <Label className="font-semibold">Headquarters / Address</Label>
                                            <p className="text-xs text-gray-500">Location or address shown on the contact page</p>
                                            <Input
                                                type="text"
                                                value={form.contact_address ?? ""}
                                                onChange={e => handleChange("contact_address", e.target.value)}
                                                placeholder="Europe"
                                            />
                                        </div>
                                    </>
                                )}

                                {/* Messaging */}
                                {activeSection === "messaging" && (
                                    <>
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className={`p-1.5 rounded-md ${colorMap.green}`}>
                                                <MessageSquare className="h-4 w-4" />
                                            </div>
                                            <h3 className="font-semibold text-gray-800">Messaging Limits</h3>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="font-semibold">Free Plan Message Limit</Label>
                                            <p className="text-xs text-gray-500">Maximum number of messages a free-plan user can send per session</p>
                                            <Input
                                                type="number"
                                                min={1}
                                                max={500}
                                                value={form.free_plan_message_limit ?? 20}
                                                onChange={e => handleChange("free_plan_message_limit", parseInt(e.target.value) || 20)}
                                            />
                                        </div>
                                        <Separator />
                                        <div className="space-y-1.5">
                                            <Label className="font-semibold">Secret / Maintenance Message</Label>
                                            <p className="text-xs text-gray-500">Internal note or message shown during maintenance (not visible to users)</p>
                                            <Textarea
                                                value={form.secret_message ?? ""}
                                                onChange={e => handleChange("secret_message", e.target.value)}
                                                rows={3}
                                                placeholder="Internal notes, maintenance messages..."
                                            />
                                        </div>
                                    </>
                                )}

                                <Separator />
                                <div className="flex justify-end gap-3 pt-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            if (config) {
                                                setForm({
                                                    default_gpt_token: config.default_gpt_token ?? "",
                                                    default_currency: config.default_currency ?? "USD",
                                                    google_capcha_key: config.google_capcha_key ?? "",
                                                    secret_message: config.secret_message ?? "",
                                                    free_plan_message_limit: config.free_plan_message_limit ?? 20,
                                                    languages: (config.languages as Record<string, boolean>) ?? { en: true },
                contact_email: config.contact_email ?? "support@aifacilitator.ai",
                business_hours: config.business_hours ?? "Mon - Fri, 9am - 6pm CET",
                contact_address: config.contact_address ?? "Europe",
                                                });
                                                setIsDirty(false);
                                            }
                                        }}
                                        disabled={!isDirty}
                                    >
                                        Reset
                                    </Button>
                                    <Button
                                        className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                                        onClick={() => saveMutation.mutate()}
                                        disabled={saveMutation.isPending || !isDirty}
                                    >
                                        {saveMutation.isPending
                                            ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving...</>
                                            : <><Save className="h-4 w-4 mr-2" /> Save Settings</>
                                        }
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};
