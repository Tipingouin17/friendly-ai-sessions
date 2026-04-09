/**
 * Prompt Management
 *
 * Admin component for the AIfacilitator application.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, AlertTriangle, Sparkles, Bot, Sliders } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

interface Session {
    id: number;
    title: string;
    facilitator: number;
    prompt: string;
    welcome_message: string;
    objective: string;
    difficulty_level: string;
    scope: string | null;
    gpt_version: string | null;
    max_tokens: number | null;
    randomness: number | null;
}

const GPT_MODEL_OPTIONS = [
    // OpenAI GPT-4.1 family (current, April 2026)
    { value: "gpt-4.1-nano",     label: "GPT-4.1 Nano — Ultra-cheap, Free tier ($0.10/$0.40 per 1M)" },
    { value: "gpt-4.1-mini",     label: "GPT-4.1 Mini — Recommended: Starter/Premium ($0.40/$1.60 per 1M) ★" },
    { value: "gpt-4.1",          label: "GPT-4.1 — Highest quality, Enterprise ($2.00/$8.00 per 1M)" },
    // Google Gemini (via OpenAI-compatible API)
    { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash — Google, ultra-fast reasoning ($0.15/$0.60 per 1M)" },
];

export const PromptManagement = () => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [selectedSession, setSelectedSession] = useState<number | null>(null);
    const [editedPrompt, setEditedPrompt] = useState("");
    const [editedWelcome, setEditedWelcome] = useState("");
    const [editedScope, setEditedScope] = useState("");
    const [editedGptVersion, setEditedGptVersion] = useState("gpt-4.1-mini");
    const [editedMaxTokens, setEditedMaxTokens] = useState(600);
    const [editedRandomness, setEditedRandomness] = useState(0.7);

    // Fetch all sessions
    const { data: sessions, isLoading } = useQuery({
        queryKey: ['admin-sessions'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('sessions')
                .select('id, title, facilitator, prompt, welcome_message, objective, difficulty_level, scope, gpt_version, max_tokens, randomness')
                .order('facilitator', { ascending: true });

            if (error) throw error;
            return data as Session[];
        }
    });

    // Update session — prompt, welcome, scope, and AI model settings
    const updatePromptMutation = useMutation({
        mutationFn: async ({
            sessionId, prompt, welcome, scope, gpt_version, max_tokens, randomness
        }: {
            sessionId: number;
            prompt: string;
            welcome: string;
            scope: string;
            gpt_version: string;
            max_tokens: number;
            randomness: number;
        }) => {
            const { error } = await supabase
                .from('sessions')
                .update({ prompt, welcome_message: welcome, scope, gpt_version, max_tokens, randomness })
                .eq('id', sessionId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-sessions'] });
            toast({ title: "Success", description: "Session settings updated successfully" });
        },
        onError: (error) => {
            toast({
                title: "Error",
                description: `Failed to update: ${error.message}`,
                variant: "destructive",
            });
        }
    });

    const handleSessionSelect = (sessionId: string) => {
        const id = parseInt(sessionId);
        setSelectedSession(id);
        const session = sessions?.find(s => s.id === id);
        if (session) {
            setEditedPrompt(session.prompt || "");
            setEditedWelcome(session.welcome_message || "");
            setEditedScope(session.scope || "");
            setEditedGptVersion(session.gpt_version || "gpt-4.1-mini");
            setEditedMaxTokens(session.max_tokens ?? 600);
            setEditedRandomness(session.randomness ?? 0.7);
        }
    };

    const handleSave = () => {
        if (!selectedSession) return;
        updatePromptMutation.mutate({
            sessionId: selectedSession,
            prompt: editedPrompt,
            welcome: editedWelcome,
            scope: editedScope,
            gpt_version: editedGptVersion,
            max_tokens: editedMaxTokens,
            randomness: editedRandomness,
        });
    };

    const handleReset = () => {
        const session = sessions?.find(s => s.id === selectedSession);
        if (!session) return;
        setEditedPrompt(session.prompt || "");
        setEditedWelcome(session.welcome_message || "");
        setEditedScope(session.scope || "");
        setEditedGptVersion(session.gpt_version || "gpt-4.1-mini");
        setEditedMaxTokens(session.max_tokens ?? 600);
        setEditedRandomness(session.randomness ?? 0.7);
    };

    const selectedSessionData = sessions?.find(s => s.id === selectedSession);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Card className="border-purple-200 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50">
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-6 w-6 text-purple-600" />
                        <CardTitle className="text-2xl">AI Prompt Management</CardTitle>
                    </div>
                    <CardDescription>
                        Configure AI behaviour, prompts, and model settings for each facilitator session
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                    <Alert className="border-amber-200 bg-amber-50">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <AlertDescription className="text-amber-800">
                            <strong>Warning:</strong> Changes to prompts and model settings will affect all future sessions
                            using these facilitators. Test thoroughly before saving.
                        </AlertDescription>
                    </Alert>

                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="session-select" className="text-base font-semibold">
                                Select Facilitator Session
                            </Label>
                            <Select onValueChange={handleSessionSelect}>
                                <SelectTrigger id="session-select" className="mt-2">
                                    <SelectValue placeholder="Choose a session to edit..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {sessions?.map((session) => (
                                        <SelectItem key={session.id} value={session.id.toString()}>
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">{session.title}</span>
                                                <span className="text-xs text-gray-500">
                                                    ({session.difficulty_level})
                                                </span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {selectedSessionData && (
                            <div className="space-y-6 pt-4 border-t">
                                {/* Session overview */}
                                <div className="grid md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                                    <div>
                                        <span className="text-sm font-medium text-gray-600">Objective:</span>
                                        <p className="text-sm mt-1">{selectedSessionData.objective}</p>
                                    </div>
                                    <div>
                                        <span className="text-sm font-medium text-gray-600">Difficulty:</span>
                                        <p className="text-sm mt-1 capitalize">{selectedSessionData.difficulty_level}</p>
                                    </div>
                                </div>

                                {/* ── AI Model Settings ── */}
                                <div className="space-y-5">
                                    <div className="flex items-center gap-2">
                                        <Bot className="h-5 w-5 text-indigo-600" />
                                        <h3 className="text-base font-semibold">AI Model Settings</h3>
                                    </div>

                                    {/* GPT Model */}
                                    <div className="space-y-2">
                                        <Label className="font-medium">AI Model</Label>
                                        <Select value={editedGptVersion} onValueChange={setEditedGptVersion}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {GPT_MODEL_OPTIONS.map(opt => (
                                                    <SelectItem key={opt.value} value={opt.value}>
                                                        {opt.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <p className="text-xs text-gray-500">
                                            The AI model used to generate facilitator responses. GPT-4.1 Mini is recommended for best cost/quality balance.
                                        </p>
                                    </div>

                                    {/* Max Tokens + Randomness side by side */}
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <Label className="font-medium flex items-center gap-1">
                                                    <Sliders className="h-4 w-4 text-gray-500" />
                                                    Max Response Length
                                                </Label>
                                                <span className="text-sm font-mono bg-gray-100 px-2 py-0.5 rounded">
                                                    {editedMaxTokens} tokens
                                                </span>
                                            </div>
                                            <Slider
                                                min={100}
                                                max={2000}
                                                step={50}
                                                value={[editedMaxTokens]}
                                                onValueChange={([v]) => setEditedMaxTokens(v)}
                                                className="w-full"
                                            />
                                            <div className="flex justify-between text-xs text-gray-400">
                                                <span>100 (concise)</span>
                                                <span>2000 (detailed)</span>
                                            </div>
                                            <p className="text-xs text-gray-500">
                                                Controls the maximum length of each AI response
                                            </p>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <Label className="font-medium flex items-center gap-1">
                                                    <Sliders className="h-4 w-4 text-gray-500" />
                                                    Creativity (Temperature)
                                                </Label>
                                                <span className="text-sm font-mono bg-gray-100 px-2 py-0.5 rounded">
                                                    {editedRandomness.toFixed(1)}
                                                </span>
                                            </div>
                                            <Slider
                                                min={0}
                                                max={2}
                                                step={0.1}
                                                value={[editedRandomness]}
                                                onValueChange={([v]) => setEditedRandomness(v)}
                                                className="w-full"
                                            />
                                            <div className="flex justify-between text-xs text-gray-400">
                                                <span>0.0 (precise)</span>
                                                <span>2.0 (creative)</span>
                                            </div>
                                            <p className="text-xs text-gray-500">
                                                Higher values make responses more varied and creative
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                {/* ── Prompt Content ── */}
                                <div className="space-y-5">
                                    <div className="space-y-2">
                                        <Label htmlFor="scope-field" className="text-base font-semibold">
                                            Session Scope
                                        </Label>
                                        <Textarea
                                            id="scope-field"
                                            value={editedScope}
                                            onChange={(e) => setEditedScope(e.target.value)}
                                            rows={3}
                                            className="font-mono text-sm"
                                            placeholder="Define the boundaries and focus areas of this session..."
                                        />
                                        <p className="text-xs text-gray-500">
                                            Appended to the AI system prompt to constrain the facilitator's focus
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="welcome-message" className="text-base font-semibold">
                                            Welcome Message
                                        </Label>
                                        <Textarea
                                            id="welcome-message"
                                            value={editedWelcome}
                                            onChange={(e) => setEditedWelcome(e.target.value)}
                                            rows={3}
                                            className="font-mono text-sm"
                                            placeholder="Enter the welcome message participants will see..."
                                        />
                                        <p className="text-xs text-gray-500">
                                            This message greets participants when they join the session
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="system-prompt" className="text-base font-semibold">
                                            System Prompt (AI Instructions)
                                        </Label>
                                        <Textarea
                                            id="system-prompt"
                                            value={editedPrompt}
                                            onChange={(e) => setEditedPrompt(e.target.value)}
                                            rows={12}
                                            className="font-mono text-sm"
                                            placeholder="Enter the system prompt that defines AI behavior..."
                                        />
                                        <p className="text-xs text-gray-500">
                                            This prompt instructs the AI on how to behave as this facilitator
                                        </p>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-4">
                                    <Button variant="outline" onClick={handleReset}>
                                        Reset Changes
                                    </Button>
                                    <Button
                                        onClick={handleSave}
                                        disabled={updatePromptMutation.isPending}
                                        className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                                    >
                                        {updatePromptMutation.isPending ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="mr-2 h-4 w-4" />
                                                Save Changes
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
