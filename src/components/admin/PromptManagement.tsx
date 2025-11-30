import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, AlertTriangle, Sparkles } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface Session {
    id: number;
    title: string;
    facilitator: number;
    prompt: string;
    welcome_message: string;
    objective: string;
    difficulty_level: string;
}

export const PromptManagement = () => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [selectedSession, setSelectedSession] = useState<number | null>(null);
    const [editedPrompt, setEditedPrompt] = useState("");
    const [editedWelcome, setEditedWelcome] = useState("");

    // Fetch all sessions
    const { data: sessions, isLoading } = useQuery({
        queryKey: ['admin-sessions'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('sessions')
                .select('*')
                .order('facilitator', { ascending: true });

            if (error) throw error;
            return data as Session[];
        }
    });

    // Update session prompt
    const updatePromptMutation = useMutation({
        mutationFn: async ({ sessionId, prompt, welcome }: { sessionId: number; prompt: string; welcome: string }) => {
            const { error } = await supabase
                .from('sessions')
                .update({
                    prompt,
                    welcome_message: welcome
                })
                .eq('id', sessionId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-sessions'] });
            toast({
                title: "Success",
                description: "Prompt updated successfully",
            });
        },
        onError: (error) => {
            toast({
                title: "Error",
                description: `Failed to update prompt: ${error.message}`,
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
        }
    };

    const handleSave = () => {
        if (!selectedSession) return;

        updatePromptMutation.mutate({
            sessionId: selectedSession,
            prompt: editedPrompt,
            welcome: editedWelcome
        });
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
                        Configure AI behavior and prompts for each facilitator type
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                    <Alert className="border-amber-200 bg-amber-50">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <AlertDescription className="text-amber-800">
                            <strong>Warning:</strong> Changes to prompts will affect all future sessions using these facilitators.
                            Test thoroughly before saving.
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

                                <div className="flex justify-end gap-3 pt-4">
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setEditedPrompt(selectedSessionData.prompt || "");
                                            setEditedWelcome(selectedSessionData.welcome_message || "");
                                        }}
                                    >
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
