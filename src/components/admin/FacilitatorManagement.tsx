/**
 * Facilitator Management — Admin Component
 * Full CRUD: create, view, edit, delete, promote/demote, reorder AI facilitators
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    Bot, Plus, Pencil, Trash2, Star, StarOff, Search, RefreshCw,
    Loader2, Languages, Zap, BarChart2, Clock, Users,
} from "lucide-react";
import { format } from "date-fns";

interface Facilitator {
    id: number;
    title: string | null;
    description: string | null;
    details: string | null;
    profile_picture: string | null;
    is_promoted: boolean | null;
    plan_id: number | null;
    specialties: string[] | null;
    languages: string[] | null;
    expertise_level: string | null;
    rating: number | null;
    total_sessions: number | null;
    order: number | null;
    created_at: string | null;
    last_active: string | null;
}

const EXPERTISE_LEVELS = ["beginner", "intermediate", "advanced", "expert"];

const emptyFacilitator = (): Partial<Facilitator> => ({
    title: "",
    description: "",
    details: "",
    profile_picture: "",
    is_promoted: false,
    plan_id: null,
    specialties: [],
    languages: ["English"],
    expertise_level: "intermediate",
    rating: 4.5,
    total_sessions: 0,
    order: 0,
});

export const FacilitatorManagement = () => {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [searchTerm, setSearchTerm] = useState("");
    const [editingFacilitator, setEditingFacilitator] = useState<Partial<Facilitator> | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [specialtyInput, setSpecialtyInput] = useState("");
    const [languageInput, setLanguageInput] = useState("");

    const { data: facilitators, isLoading, refetch } = useQuery({
        queryKey: ["admin-facilitators", searchTerm],
        queryFn: async () => {
            let query = supabase
                .from("facilitators")
                .select("id, title, description, details, profile_picture, is_promoted, plan_id, specialties, languages, expertise_level, rating, total_sessions, order, created_at, last_active")
                .order("order", { ascending: true });
            if (searchTerm) query = query.ilike("title", `%${searchTerm}%`);
            const { data, error } = await query;
            if (error) throw error;
            return data as Facilitator[];
        },
    });

    const { data: plans } = useQuery({
        queryKey: ["admin-plans-list"],
        queryFn: async () => {
            const { data, error } = await supabase.from("plans").select("id, title").order("id");
            if (error) throw error;
            return data as { id: number; title: string }[];
        },
    });

    const upsertMutation = useMutation({
        mutationFn: async (facilitator: Partial<Facilitator>) => {
            if (facilitator.id) {
                const { id, created_at, last_active, ...updates } = facilitator;
                const { error } = await supabase.from("facilitators").update(updates).eq("id", id!);
                if (error) throw error;
            } else {
                const { id: _id, ...insertData } = facilitator;
                const { error } = await supabase.from("facilitators").insert(insertData as any);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-facilitators"] });
            toast({ title: isCreating ? "Facilitator created" : "Facilitator updated", description: "Changes saved successfully." });
            setEditingFacilitator(null);
            setIsCreating(false);
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            const { error } = await supabase.from("facilitators").delete().eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-facilitators"] });
            toast({ title: "Facilitator deleted", description: "The facilitator has been removed." });
            setDeletingId(null);
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    const togglePromoted = (f: Facilitator) => {
        upsertMutation.mutate({ ...f, is_promoted: !f.is_promoted });
    };

    const openEdit = (f: Facilitator) => {
        setEditingFacilitator({ ...f });
        setIsCreating(false);
    };

    const openCreate = () => {
        setEditingFacilitator(emptyFacilitator());
        setIsCreating(true);
    };

    const addSpecialty = () => {
        if (!specialtyInput.trim() || !editingFacilitator) return;
        setEditingFacilitator(prev => ({
            ...prev!,
            specialties: [...(prev!.specialties ?? []), specialtyInput.trim()],
        }));
        setSpecialtyInput("");
    };

    const removeSpecialty = (idx: number) => {
        setEditingFacilitator(prev => ({
            ...prev!,
            specialties: (prev!.specialties ?? []).filter((_, i) => i !== idx),
        }));
    };

    const addLanguage = () => {
        if (!languageInput.trim() || !editingFacilitator) return;
        setEditingFacilitator(prev => ({
            ...prev!,
            languages: [...(prev!.languages ?? []), languageInput.trim()],
        }));
        setLanguageInput("");
    };

    const removeLanguage = (idx: number) => {
        setEditingFacilitator(prev => ({
            ...prev!,
            languages: (prev!.languages ?? []).filter((_, i) => i !== idx),
        }));
    };

    const planName = (planId: number | null) => plans?.find(p => p.id === planId)?.title ?? "All Plans";

    return (
        <div className="space-y-6">
            <Card className="border-purple-200 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-t-lg">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 rounded-lg">
                                <Bot className="h-6 w-6 text-purple-600" />
                            </div>
                            <div>
                                <CardTitle className="text-xl">Facilitator Management</CardTitle>
                                <CardDescription>Create, edit, and manage AI facilitators available on the platform</CardDescription>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => refetch()}>
                                <RefreshCw className="h-4 w-4 mr-1" /> Refresh
                            </Button>
                            <Button size="sm" className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700" onClick={openCreate}>
                                <Plus className="h-4 w-4 mr-1" /> New Facilitator
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="pt-5 space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Search facilitators..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="pl-9"
                        />
                    </div>

                    {isLoading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {facilitators?.map(f => (
                                <Card key={f.id} className={`relative border transition-all hover:shadow-md ${f.is_promoted ? "border-purple-300 bg-purple-50/30" : "border-gray-200"}`}>
                                    {f.is_promoted && (
                                        <div className="absolute top-3 right-3">
                                            <Badge className="bg-amber-100 text-amber-800 border border-amber-200 text-xs">
                                                <Star className="h-3 w-3 mr-1 fill-amber-500 text-amber-500" /> Featured
                                            </Badge>
                                        </div>
                                    )}
                                    <CardContent className="pt-5 pb-4">
                                        <div className="flex items-start gap-3 mb-3">
                                            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white font-bold text-lg shrink-0 overflow-hidden">
                                                {f.profile_picture ? (
                                                    <img src={f.profile_picture} alt={f.title ?? ""} className="h-full w-full object-cover" />
                                                ) : (
                                                    (f.title?.[0] ?? "?").toUpperCase()
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h3 className="font-semibold text-gray-900 truncate">{f.title ?? "Untitled"}</h3>
                                                <p className="text-xs text-gray-500 capitalize">{f.expertise_level ?? "—"} level</p>
                                            </div>
                                        </div>

                                        <p className="text-sm text-gray-600 line-clamp-2 mb-3">{f.description ?? f.details ?? "No description."}</p>

                                        <div className="flex flex-wrap gap-1 mb-3">
                                            {(f.specialties ?? []).slice(0, 3).map((s, i) => (
                                                <Badge key={i} variant="outline" className="text-xs">{s}</Badge>
                                            ))}
                                            {(f.specialties?.length ?? 0) > 3 && (
                                                <Badge variant="outline" className="text-xs">+{(f.specialties?.length ?? 0) - 3}</Badge>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-3 gap-2 text-xs text-gray-500 mb-4">
                                            <div className="flex items-center gap-1">
                                                <BarChart2 className="h-3 w-3" />
                                                <span>{f.rating?.toFixed(1) ?? "—"}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Users className="h-3 w-3" />
                                                <span>{f.total_sessions ?? 0} sessions</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Languages className="h-3 w-3" />
                                                <span>{(f.languages?.length ?? 0)} lang</span>
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="flex-1 text-xs"
                                                onClick={() => openEdit(f)}
                                            >
                                                <Pencil className="h-3 w-3 mr-1" /> Edit
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className={`text-xs ${f.is_promoted ? "text-amber-600 border-amber-200 hover:bg-amber-50" : "text-gray-600"}`}
                                                onClick={() => togglePromoted(f)}
                                                disabled={upsertMutation.isPending}
                                            >
                                                {f.is_promoted ? <StarOff className="h-3 w-3" /> : <Star className="h-3 w-3" />}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="text-red-600 border-red-200 hover:bg-red-50 text-xs"
                                                onClick={() => setDeletingId(f.id)}
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}

                    {facilitators?.length === 0 && !isLoading && (
                        <div className="text-center py-16 text-gray-500">
                            <Bot className="h-12 w-12 mx-auto mb-3 opacity-30" />
                            <p className="font-medium">No facilitators found</p>
                            <Button size="sm" className="mt-3 bg-purple-600 hover:bg-purple-700" onClick={openCreate}>
                                <Plus className="h-4 w-4 mr-1" /> Create First Facilitator
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Create / Edit Dialog */}
            <Dialog open={!!editingFacilitator} onOpenChange={open => !open && setEditingFacilitator(null)}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{isCreating ? "Create New Facilitator" : `Edit: ${editingFacilitator?.title}`}</DialogTitle>
                        <DialogDescription>
                            {isCreating ? "Add a new AI facilitator to the platform." : "Update this facilitator's profile and settings."}
                        </DialogDescription>
                    </DialogHeader>

                    {editingFacilitator && (
                        <div className="space-y-5 py-2">
                            {/* Basic Info */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="f-title">Name *</Label>
                                    <Input
                                        id="f-title"
                                        value={editingFacilitator.title ?? ""}
                                        onChange={e => setEditingFacilitator(p => ({ ...p!, title: e.target.value }))}
                                        placeholder="e.g. Dr. Sarah Chen"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="f-expertise">Expertise Level</Label>
                                    <Select
                                        value={editingFacilitator.expertise_level ?? "intermediate"}
                                        onValueChange={v => setEditingFacilitator(p => ({ ...p!, expertise_level: v }))}
                                    >
                                        <SelectTrigger id="f-expertise">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {EXPERTISE_LEVELS.map(l => (
                                                <SelectItem key={l} value={l} className="capitalize">{l}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="f-description">Short Description</Label>
                                <Input
                                    id="f-description"
                                    value={editingFacilitator.description ?? ""}
                                    onChange={e => setEditingFacilitator(p => ({ ...p!, description: e.target.value }))}
                                    placeholder="One-line description shown on cards"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="f-details">Full Bio / Details</Label>
                                <Textarea
                                    id="f-details"
                                    value={editingFacilitator.details ?? ""}
                                    onChange={e => setEditingFacilitator(p => ({ ...p!, details: e.target.value }))}
                                    rows={4}
                                    placeholder="Detailed background, approach, and credentials..."
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="f-picture">Profile Picture URL</Label>
                                <Input
                                    id="f-picture"
                                    value={editingFacilitator.profile_picture ?? ""}
                                    onChange={e => setEditingFacilitator(p => ({ ...p!, profile_picture: e.target.value }))}
                                    placeholder="https://..."
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="f-rating">Rating (0–5)</Label>
                                    <Input
                                        id="f-rating"
                                        type="number"
                                        min={0} max={5} step={0.1}
                                        value={editingFacilitator.rating ?? ""}
                                        onChange={e => setEditingFacilitator(p => ({ ...p!, rating: parseFloat(e.target.value) || null }))}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="f-sessions">Total Sessions</Label>
                                    <Input
                                        id="f-sessions"
                                        type="number"
                                        min={0}
                                        value={editingFacilitator.total_sessions ?? ""}
                                        onChange={e => setEditingFacilitator(p => ({ ...p!, total_sessions: parseInt(e.target.value) || 0 }))}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="f-order">Display Order</Label>
                                    <Input
                                        id="f-order"
                                        type="number"
                                        min={0}
                                        value={editingFacilitator.order ?? ""}
                                        onChange={e => setEditingFacilitator(p => ({ ...p!, order: parseInt(e.target.value) || 0 }))}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="f-plan">Restrict to Plan</Label>
                                <Select
                                    value={editingFacilitator.plan_id ? String(editingFacilitator.plan_id) : "all"}
                                    onValueChange={v => setEditingFacilitator(p => ({ ...p!, plan_id: v === "all" ? null : parseInt(v) }))}
                                >
                                    <SelectTrigger id="f-plan">
                                        <SelectValue placeholder="Available to all plans" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Plans (no restriction)</SelectItem>
                                        {plans?.map(p => (
                                            <SelectItem key={p.id} value={String(p.id)}>{p.title}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Specialties */}
                            <div className="space-y-2">
                                <Label>Specialties</Label>
                                <div className="flex gap-2">
                                    <Input
                                        value={specialtyInput}
                                        onChange={e => setSpecialtyInput(e.target.value)}
                                        placeholder="e.g. Leadership, Design Thinking"
                                        onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addSpecialty())}
                                    />
                                    <Button type="button" variant="outline" size="sm" onClick={addSpecialty}>Add</Button>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {(editingFacilitator.specialties ?? []).map((s, i) => (
                                        <Badge key={i} variant="secondary" className="cursor-pointer hover:bg-red-100 hover:text-red-700 transition-colors" onClick={() => removeSpecialty(i)}>
                                            {s} ×
                                        </Badge>
                                    ))}
                                </div>
                            </div>

                            {/* Languages */}
                            <div className="space-y-2">
                                <Label>Languages</Label>
                                <div className="flex gap-2">
                                    <Input
                                        value={languageInput}
                                        onChange={e => setLanguageInput(e.target.value)}
                                        placeholder="e.g. French, Spanish"
                                        onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addLanguage())}
                                    />
                                    <Button type="button" variant="outline" size="sm" onClick={addLanguage}>Add</Button>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {(editingFacilitator.languages ?? []).map((l, i) => (
                                        <Badge key={i} variant="secondary" className="cursor-pointer hover:bg-red-100 hover:text-red-700 transition-colors" onClick={() => removeLanguage(i)}>
                                            {l} ×
                                        </Badge>
                                    ))}
                                </div>
                            </div>

                            <Separator />

                            {/* Featured toggle */}
                            <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200">
                                <div>
                                    <Label className="font-semibold text-amber-800">Featured Facilitator</Label>
                                    <p className="text-xs text-amber-700 mt-0.5">Highlighted with a star badge on the platform</p>
                                </div>
                                <Switch
                                    checked={editingFacilitator.is_promoted ?? false}
                                    onCheckedChange={v => setEditingFacilitator(p => ({ ...p!, is_promoted: v }))}
                                />
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingFacilitator(null)}>Cancel</Button>
                        <Button
                            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                            onClick={() => editingFacilitator && upsertMutation.mutate(editingFacilitator)}
                            disabled={upsertMutation.isPending || !editingFacilitator?.title}
                        >
                            {upsertMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            {isCreating ? "Create Facilitator" : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={!!deletingId} onOpenChange={open => !open && setDeletingId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Facilitator</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete this facilitator. Any sessions linked to this facilitator may be affected. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => deletingId && deleteMutation.mutate(deletingId)}
                            disabled={deleteMutation.isPending}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};
