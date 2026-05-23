/**
 * Toolbox Management — Admin Component
 *
 * Manages the extensible facilitator toolbox catalog and the per-facilitator
 * access matrix that determines which AI facilitator can use which tool.
 */
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    Wrench, Plus, Pencil, RefreshCw, Loader2, Search, Bot, Save, Sparkles,
} from "lucide-react";
import type { FacilitatorTool, FacilitatorToolConfig } from "@/types/facilitator";

interface FacilitatorSummary {
    id: number;
    title: string | null;
    plan_id: number | null;
    lock: boolean | null;
}

interface ToolAccessRow {
    id: number;
    facilitator_id: number;
    tool_id: number;
    enabled: boolean;
    config_override: FacilitatorToolConfig | null;
}

type ToolInsertPayload = Omit<FacilitatorTool, "id" | "created_at" | "updated_at">;
type ToolAccessUpsertPayload = Pick<ToolAccessRow, "facilitator_id" | "tool_id" | "enabled" | "config_override"> & {
    id?: number;
};

const TOOL_CATEGORIES = ["discussion", "participation", "ideation", "decision", "reflection", "facilitation"];

const emptyTool = (): Partial<FacilitatorTool> => ({
    name: "",
    slug: "",
    description: "",
    category: "facilitation",
    config: {
        composerLabel: "Share a response",
        hostCue: "Guide the group with this tool.",
        participantPrompt: "Add your contribution.",
        runtimeBehavior: "balanced_moderator",
        visualAccent: "indigo",
        supportsAnonymousInput: false,
        supportsVoting: false,
    },
    token_cost_per_use: 0,
    is_active: true,
});

const slugify = (value: string) => value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const normalizeConfig = (value: unknown): FacilitatorToolConfig => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return value as FacilitatorToolConfig;
};

export const ToolboxManagement = () => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");
    const [editingTool, setEditingTool] = useState<Partial<FacilitatorTool> | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [selectedFacilitatorId, setSelectedFacilitatorId] = useState<number | null>(null);
    const [assignmentDraft, setAssignmentDraft] = useState<Record<number, boolean>>({});

    const { data: tools, isLoading: toolsLoading, refetch: refetchTools } = useQuery({
        queryKey: ["admin-toolbox-tools", searchTerm],
        queryFn: async () => {
            let query = api
                .from("facilitator_tools")
                .select("*")
                .order("category", { ascending: true })
                .order("name", { ascending: true });
            if (searchTerm) query = query.ilike("name", `%${searchTerm}%`);
            const { data, error } = await query;
            if (error) throw error;
            return (data ?? []) as FacilitatorTool[];
        },
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
    });

    const { data: facilitators, isLoading: facilitatorsLoading } = useQuery({
        queryKey: ["admin-toolbox-facilitators"],
        queryFn: async () => {
            const { data, error } = await api
                .from("facilitators")
                .select("id, title, plan_id, lock")
                .order("order", { ascending: true });
            if (error) throw error;
            const list = (data ?? []) as FacilitatorSummary[];
            if (!selectedFacilitatorId && list[0]?.id) setSelectedFacilitatorId(list[0].id);
            return list;
        },
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
    });

    const { data: accessRows, isLoading: accessLoading } = useQuery({
        queryKey: ["admin-toolbox-access", selectedFacilitatorId],
        queryFn: async () => {
            if (!selectedFacilitatorId) return [];
            const { data, error } = await api
                .from("facilitator_tool_access")
                .select("id, facilitator_id, tool_id, enabled, config_override")
                .eq("facilitator_id", selectedFacilitatorId);
            if (error) throw error;
            const rows = (data ?? []) as ToolAccessRow[];
            setAssignmentDraft(Object.fromEntries(rows.map(row => [row.tool_id, row.enabled])));
            return rows;
        },
        enabled: !!selectedFacilitatorId,
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
    });

    const filteredTools = useMemo(() => tools ?? [], [tools]);
    const selectedFacilitator = facilitators?.find(f => f.id === selectedFacilitatorId) ?? null;
    const accessByToolId = useMemo(() => new Map((accessRows ?? []).map(row => [row.tool_id, row])), [accessRows]);

    const upsertToolMutation = useMutation({
        mutationFn: async (tool: Partial<FacilitatorTool>) => {
            const config = normalizeConfig(tool.config);
            const payload: ToolInsertPayload = {
                name: tool.name?.trim() || "Untitled Tool",
                slug: slugify(tool.slug || tool.name || "untitled_tool"),
                description: tool.description || null,
                category: tool.category || "facilitation",
                config,
                token_cost_per_use: Number(tool.token_cost_per_use ?? 0),
                is_active: tool.is_active ?? true,
            };

            if (tool.id) {
                const { error } = await api.from("facilitator_tools").update(payload).eq("id", tool.id);
                if (error) throw error;
            } else {
                const { error } = await api.from("facilitator_tools").insert(payload);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-toolbox-tools"] });
            queryClient.invalidateQueries({ queryKey: ["admin-toolbox-access"] });
            toast({ title: isCreating ? "Tool created" : "Tool updated", description: "The toolbox catalog has been saved." });
            setEditingTool(null);
            setIsCreating(false);
        },
        onError: (error: Error) => toast({ title: "Tool save failed", description: error.message, variant: "destructive" }),
    });

    const saveAssignmentsMutation = useMutation({
        mutationFn: async () => {
            if (!selectedFacilitatorId || !tools?.length) return;
            const rows: ToolAccessUpsertPayload[] = tools.map(tool => {
                const existing = accessByToolId.get(tool.id);
                return {
                    ...(existing?.id ? { id: existing.id } : {}),
                    facilitator_id: selectedFacilitatorId,
                    tool_id: tool.id,
                    enabled: assignmentDraft[tool.id] ?? existing?.enabled ?? false,
                    config_override: existing?.config_override ?? {},
                };
            });
            const { error } = await api
                .from("facilitator_tool_access")
                .upsert(rows, { onConflict: "facilitator_id,tool_id" });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-toolbox-access", selectedFacilitatorId] });
            toast({ title: "Assignments saved", description: "This facilitator now receives the selected tools at runtime." });
        },
        onError: (error: Error) => toast({ title: "Assignment save failed", description: error.message, variant: "destructive" }),
    });

    const updateConfigField = (key: keyof FacilitatorToolConfig, value: unknown) => {
        setEditingTool(prev => ({
            ...prev!,
            config: {
                ...normalizeConfig(prev?.config),
                [key]: value,
            },
        }));
    };

    const openCreate = () => {
        setEditingTool(emptyTool());
        setIsCreating(true);
    };

    const openEdit = (tool: FacilitatorTool) => {
        setEditingTool({ ...tool, config: normalizeConfig(tool.config) });
        setIsCreating(false);
    };

    return (
        <div className="space-y-6">
            <Card className="border-indigo-200 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-t-lg">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-100 rounded-lg">
                                <Wrench className="h-6 w-6 text-indigo-600" />
                            </div>
                            <div>
                                <CardTitle className="text-xl">Toolbox Management</CardTitle>
                                <CardDescription>Maintain facilitation tools and assign the exact toolbox each facilitator can choose from.</CardDescription>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => refetchTools()}>
                                <RefreshCw className="h-4 w-4 mr-1" /> Refresh
                            </Button>
                            <Button size="sm" className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700" onClick={openCreate}>
                                <Plus className="h-4 w-4 mr-1" /> New Tool
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-5 space-y-5">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Search toolbox tools..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>

                    {toolsLoading ? (
                        <div className="flex items-center justify-center py-10">
                            <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                            {filteredTools.map(tool => {
                                const config = normalizeConfig(tool.config);
                                return (
                                    <Card key={tool.id} className="border-slate-200 hover:shadow-md transition-shadow">
                                        <CardContent className="p-4 space-y-3">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <h3 className="font-semibold text-slate-900">{tool.name}</h3>
                                                        <Badge variant={tool.is_active ? "default" : "secondary"}>{tool.is_active ? "Active" : "Inactive"}</Badge>
                                                    </div>
                                                    <p className="text-xs text-slate-500 font-mono">{tool.slug}</p>
                                                </div>
                                                <Button variant="ghost" size="sm" onClick={() => openEdit(tool)}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            <p className="text-sm text-slate-600 line-clamp-3">{tool.description ?? "No description provided."}</p>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <Badge variant="outline">{tool.category}</Badge>
                                                <Badge variant="outline">{tool.token_cost_per_use} tokens/use</Badge>
                                                {config.supportsVoting && <Badge className="bg-emerald-100 text-emerald-800">Voting</Badge>}
                                                {config.supportsAnonymousInput && <Badge className="bg-blue-100 text-blue-800">Anonymous input</Badge>}
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="border-purple-200 shadow-lg">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                            <Bot className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                            <CardTitle>Facilitator Tool Access</CardTitle>
                            <CardDescription>Select a facilitator, then choose the tools available to that facilitator during live sessions.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-5">
                    <div className="grid gap-2 max-w-xl">
                        <Label>Facilitator</Label>
                        <Select value={selectedFacilitatorId?.toString() ?? ""} onValueChange={value => setSelectedFacilitatorId(Number(value))}>
                            <SelectTrigger>
                                <SelectValue placeholder="Choose a facilitator" />
                            </SelectTrigger>
                            <SelectContent>
                                {(facilitators ?? []).map(f => (
                                    <SelectItem key={f.id} value={f.id.toString()}>{f.title ?? `Facilitator #${f.id}`}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <Separator />

                    {facilitatorsLoading || accessLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-7 w-7 animate-spin text-purple-600" />
                        </div>
                    ) : selectedFacilitator ? (
                        <div className="space-y-4">
                            <div className="rounded-lg border bg-slate-50 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <div>
                                    <p className="text-sm font-semibold text-slate-900">{selectedFacilitator.title ?? `Facilitator #${selectedFacilitator.id}`}</p>
                                    <p className="text-xs text-slate-500">Plan tier {selectedFacilitator.plan_id ?? "all"} · {selectedFacilitator.lock ? "Locked" : "Available"}</p>
                                </div>
                                <Button onClick={() => saveAssignmentsMutation.mutate()} disabled={saveAssignmentsMutation.isPending}>
                                    {saveAssignmentsMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                                    Save toolbox
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {(tools ?? []).map(tool => {
                                    const current = assignmentDraft[tool.id] ?? accessByToolId.get(tool.id)?.enabled ?? false;
                                    return (
                                        <div key={tool.id} className="flex items-start justify-between gap-4 rounded-lg border p-4 bg-white">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <Sparkles className="h-4 w-4 text-indigo-500" />
                                                    <p className="font-medium text-slate-900">{tool.name}</p>
                                                </div>
                                                <p className="text-xs text-slate-500">{tool.category} · {tool.token_cost_per_use} tokens/use</p>
                                                <p className="text-sm text-slate-600 line-clamp-2">{tool.description}</p>
                                            </div>
                                            <Switch
                                                checked={current}
                                                onCheckedChange={(checked) => setAssignmentDraft(prev => ({ ...prev, [tool.id]: checked }))}
                                                aria-label={`Toggle ${tool.name}`}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="text-sm text-slate-500 border rounded-lg p-6 text-center">Create a facilitator first, then assign toolbox access here.</div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={!!editingTool} onOpenChange={(open) => !open && setEditingTool(null)}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{isCreating ? "Create Tool" : "Edit Tool"}</DialogTitle>
                        <DialogDescription>Tools are reusable facilitation modes. Facilitators only choose from tools assigned to them.</DialogDescription>
                    </DialogHeader>
                    {editingTool && (
                        <div className="space-y-4 py-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label>Name</Label>
                                    <Input value={editingTool.name ?? ""} onChange={e => setEditingTool(prev => ({ ...prev!, name: e.target.value, slug: prev?.slug || slugify(e.target.value) }))} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Slug</Label>
                                    <Input value={editingTool.slug ?? ""} onChange={e => setEditingTool(prev => ({ ...prev!, slug: slugify(e.target.value) }))} className="font-mono" />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Description</Label>
                                <Textarea value={editingTool.description ?? ""} onChange={e => setEditingTool(prev => ({ ...prev!, description: e.target.value }))} rows={3} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label>Category</Label>
                                    <Select value={editingTool.category ?? "facilitation"} onValueChange={value => setEditingTool(prev => ({ ...prev!, category: value }))}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {TOOL_CATEGORIES.map(category => <SelectItem key={category} value={category}>{category}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Token cost per use</Label>
                                    <Input type="number" min={0} value={editingTool.token_cost_per_use ?? 0} onChange={e => setEditingTool(prev => ({ ...prev!, token_cost_per_use: Number(e.target.value) }))} />
                                </div>
                            </div>
                            <Separator />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label>Composer label</Label>
                                    <Input value={(editingTool.config?.composerLabel as string) ?? ""} onChange={e => updateConfigField("composerLabel", e.target.value)} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Visual accent</Label>
                                    <Input value={(editingTool.config?.visualAccent as string) ?? "indigo"} onChange={e => updateConfigField("visualAccent", e.target.value)} />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Host cue</Label>
                                <Textarea value={(editingTool.config?.hostCue as string) ?? ""} onChange={e => updateConfigField("hostCue", e.target.value)} rows={2} />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Participant prompt</Label>
                                <Textarea value={(editingTool.config?.participantPrompt as string) ?? ""} onChange={e => updateConfigField("participantPrompt", e.target.value)} rows={2} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 rounded-lg bg-slate-50 p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <Label>Active</Label>
                                    <Switch checked={editingTool.is_active ?? true} onCheckedChange={checked => setEditingTool(prev => ({ ...prev!, is_active: checked }))} />
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <Label>Anonymous input</Label>
                                    <Switch checked={Boolean(editingTool.config?.supportsAnonymousInput)} onCheckedChange={checked => updateConfigField("supportsAnonymousInput", checked)} />
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <Label>Voting</Label>
                                    <Switch checked={Boolean(editingTool.config?.supportsVoting)} onCheckedChange={checked => updateConfigField("supportsVoting", checked)} />
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingTool(null)}>Cancel</Button>
                        <Button onClick={() => editingTool && upsertToolMutation.mutate(editingTool)} disabled={upsertToolMutation.isPending}>
                            {upsertToolMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Save tool
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};
