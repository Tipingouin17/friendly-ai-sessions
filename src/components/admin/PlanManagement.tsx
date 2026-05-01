/**
 * Plan Management — Admin Component
 * Create, edit, delete subscription plans and their feature restrictions.
 * Uses the real `plans` and `plan_restrictions` tables.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    Package, Plus, Pencil, Trash2, Users, Star, RefreshCw,
    Loader2, CheckCircle, CreditCard,
} from "lucide-react";

interface Plan {
    id: number;
    title: string | null;
    price: number | null;
    description: string | null;
    stripe_plan_id: string | null;
    plan_type: string | null;
    is_popular: boolean | null;
    currency: string | null;
    valid_from: string | null;
    valid_until: string | null;
    created_at: string | null;
}

interface PlanRestriction {
    id: number;
    plan_id: number | null;
    session_limit: number | null;
    facilitator_limit: number | null;
    max_participants: number | null;
    customisable_sessions: boolean | null;
    customisable_facilitators: boolean;
    saved_sessions: boolean | null;
    session_reports: boolean | null;
    data_export: boolean | null;
    question_limit: number;
    custom_branding: boolean | null;
    priority_support: boolean | null;
    created_at: string | null;
}

interface PlanWithStats extends Plan {
    user_count: number;
    restriction: PlanRestriction | null;
}

const PLAN_TYPES = ["free", "standard", "premium", "enterprise"];

const emptyPlan = (): Partial<Plan> => ({
    title: "",
    price: 0,
    description: "",
    stripe_plan_id: "",
    plan_type: "standard",
    is_popular: false,
    currency: "USD",
    valid_from: null,
    valid_until: null,
});

const emptyRestriction = (): Partial<PlanRestriction> => ({
    session_limit: 5,
    facilitator_limit: 3,
    max_participants: 10,
    customisable_sessions: false,
    customisable_facilitators: false,
    saved_sessions: false,
    session_reports: false,
    data_export: false,
    question_limit: 20,
    custom_branding: false,
    priority_support: false,
});

const FeatureToggle = ({
    label, description, checked, onChange,
}: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) => (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
        <div>
            <p className="text-sm font-medium text-gray-800">{label}</p>
            <p className="text-xs text-gray-500">{description}</p>
        </div>
        <Switch checked={checked} onCheckedChange={onChange} />
    </div>
);

export const PlanManagement = () => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [editingPlan, setEditingPlan] = useState<Partial<Plan> | null>(null);
    const [editingRestriction, setEditingRestriction] = useState<Partial<PlanRestriction> | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<"details" | "features">("details");

    const { data: plans, isLoading, refetch } = useQuery({
        queryKey: ["admin-plans"],
        queryFn: async () => {
            const [{ data: plansData, error: plansError }, { data: restrictions }, { data: profiles }] = await Promise.all([
                api.from("plans").select("*").order("price", { ascending: true }),
                api.from("plan_restrictions").select("*"),
                api.from("profiles").select("current_plan_id"),
            ]);
            if (plansError) throw plansError;

            const userCounts: Record<number, number> = {};
            profiles?.forEach(p => {
                if (p.current_plan_id) {
                    userCounts[p.current_plan_id] = (userCounts[p.current_plan_id] ?? 0) + 1;
                }
            });

            return (plansData ?? []).map(plan => ({
                ...plan,
                user_count: userCounts[plan.id] ?? 0,
                restriction: restrictions?.find(r => r.plan_id === plan.id) ?? null,
            })) as PlanWithStats[];
        },
    });

    const savePlanMutation = useMutation({
        mutationFn: async () => {
            if (!editingPlan) return;
            if (isCreating) {
                const maxId = Math.max(0, ...(plans?.map(p => p.id) ?? []));
                const newId = maxId + 1;
                const { error: planError } = await api.from("plans").insert({
                    id: newId,
                    title: editingPlan.title,
                    price: editingPlan.price ?? 0,
                    description: editingPlan.description,
                    stripe_plan_id: editingPlan.stripe_plan_id,
                    plan_type: editingPlan.plan_type ?? "standard",
                    is_popular: editingPlan.is_popular ?? false,
                    currency: editingPlan.currency ?? "USD",
                    valid_from: editingPlan.valid_from ?? null,
                    valid_until: editingPlan.valid_until ?? null,
                } as any);
                if (planError) throw planError;

                if (editingRestriction) {
                    const { error: rError } = await api.from("plan_restrictions").insert({
                        id: newId,
                        plan_id: newId,
                        session_limit: editingRestriction.session_limit,
                        facilitator_limit: editingRestriction.facilitator_limit,
                        max_participants: editingRestriction.max_participants,
                        customisable_sessions: editingRestriction.customisable_sessions,
                        customisable_facilitators: editingRestriction.customisable_facilitators ?? false,
                        saved_sessions: editingRestriction.saved_sessions,
                        session_reports: editingRestriction.session_reports,
                        data_export: editingRestriction.data_export,
                        question_limit: editingRestriction.question_limit ?? 20,
                        custom_branding: editingRestriction.custom_branding,
                        priority_support: editingRestriction.priority_support,
                    } as any);
                    if (rError) throw rError;
                }
            } else {
                const { error: planError } = await api.from("plans").update({
                    title: editingPlan.title,
                    price: editingPlan.price,
                    description: editingPlan.description,
                    stripe_plan_id: editingPlan.stripe_plan_id,
                    plan_type: editingPlan.plan_type,
                    is_popular: editingPlan.is_popular,
                    currency: editingPlan.currency,
                    valid_from: editingPlan.valid_from ?? null,
                    valid_until: editingPlan.valid_until ?? null,
                }).eq("id", editingPlan.id!);
                if (planError) throw planError;

                if (editingRestriction) {
                    const existingRestriction = plans?.find(p => p.id === editingPlan.id)?.restriction;
                    if (existingRestriction) {
                        const { error: rError } = await api.from("plan_restrictions").update({
                            session_limit: editingRestriction.session_limit,
                            facilitator_limit: editingRestriction.facilitator_limit,
                            max_participants: editingRestriction.max_participants,
                            customisable_sessions: editingRestriction.customisable_sessions,
                            customisable_facilitators: editingRestriction.customisable_facilitators ?? false,
                            saved_sessions: editingRestriction.saved_sessions,
                            session_reports: editingRestriction.session_reports,
                            data_export: editingRestriction.data_export,
                            question_limit: editingRestriction.question_limit ?? 20,
                            custom_branding: editingRestriction.custom_branding,
                            priority_support: editingRestriction.priority_support,
                        }).eq("plan_id", editingPlan.id!);
                        if (rError) throw rError;
                    } else {
                        const { error: rError } = await api.from("plan_restrictions").insert({
                            id: editingPlan.id!,
                            plan_id: editingPlan.id!,
                            session_limit: editingRestriction.session_limit,
                            facilitator_limit: editingRestriction.facilitator_limit,
                            max_participants: editingRestriction.max_participants,
                            customisable_sessions: editingRestriction.customisable_sessions,
                            customisable_facilitators: editingRestriction.customisable_facilitators ?? false,
                            saved_sessions: editingRestriction.saved_sessions,
                            session_reports: editingRestriction.session_reports,
                            data_export: editingRestriction.data_export,
                            question_limit: editingRestriction.question_limit ?? 20,
                            custom_branding: editingRestriction.custom_branding,
                            priority_support: editingRestriction.priority_support,
                        } as any);
                        if (rError) throw rError;
                    }
                }
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-plans"] });
            toast({ title: isCreating ? "Plan created" : "Plan updated" });
            setEditingPlan(null);
            setEditingRestriction(null);
            setIsCreating(false);
        },
        onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });

    const deletePlanMutation = useMutation({
        mutationFn: async (id: number) => {
            await api.from("plan_restrictions").delete().eq("plan_id", id);
            const { error } = await api.from("plans").delete().eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-plans"] });
            toast({ title: "Plan deleted" });
            setDeletingId(null);
        },
        onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });

    const openCreate = () => {
        setIsCreating(true);
        setEditingPlan(emptyPlan());
        setEditingRestriction(emptyRestriction());
        setActiveTab("details");
    };

    const openEdit = (plan: PlanWithStats) => {
        setIsCreating(false);
        setEditingPlan({ ...plan });
        setEditingRestriction(plan.restriction ? { ...plan.restriction } : emptyRestriction());
        setActiveTab("details");
    };

    const planTypeBadge = (type: string | null) => {
        const colors: Record<string, string> = {
            free: "bg-gray-100 text-gray-700",
            standard: "bg-blue-100 text-blue-700",
            premium: "bg-purple-100 text-purple-700",
            enterprise: "bg-amber-100 text-amber-700",
        };
        return (
            <Badge className={`${colors[type ?? "standard"] ?? colors.standard} border-0 text-xs capitalize`}>
                {type ?? "standard"}
            </Badge>
        );
    };

    return (
        <div className="space-y-6">
            <Card className="border-purple-200 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-t-lg">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 rounded-lg">
                                <Package className="h-6 w-6 text-purple-600" />
                            </div>
                            <div>
                                <CardTitle className="text-xl">Plan Management</CardTitle>
                                <CardDescription>Create and manage subscription plans, pricing, and feature access</CardDescription>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => refetch()}>
                                <RefreshCw className="h-4 w-4 mr-1" /> Refresh
                            </Button>
                            <Button
                                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                                onClick={openCreate}
                            >
                                <Plus className="h-4 w-4 mr-1" /> New Plan
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="pt-5">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                        </div>
                    ) : plans?.length === 0 ? (
                        <div className="text-center py-16 text-gray-500">
                            <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
                            <p className="font-medium">No plans found</p>
                            <Button variant="outline" className="mt-4" onClick={openCreate}>
                                <Plus className="h-4 w-4 mr-1" /> Create your first plan
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {plans?.map(plan => (
                                <div
                                    key={plan.id}
                                    className={`relative rounded-2xl border p-5 flex flex-col gap-4 transition-all hover:shadow-md ${
                                        plan.is_popular
                                            ? "border-purple-300 bg-gradient-to-b from-purple-50 to-white shadow-purple-100 shadow-md"
                                            : "border-gray-200 bg-white"
                                    }`}
                                >
                                    {plan.is_popular && (
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                            <Badge className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-0 text-xs px-3">
                                                <Star className="h-3 w-3 mr-1" /> Most Popular
                                            </Badge>
                                        </div>
                                    )}

                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="font-bold text-gray-900 text-lg">{plan.title ?? "Untitled Plan"}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                {planTypeBadge(plan.plan_type)}
                                                <span className="text-xs text-gray-400">ID: {plan.id}</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-2xl font-bold text-gray-900">
                                                {plan.price === 0 ? "Free" : `${plan.currency ?? "$"}${plan.price}`}
                                            </p>
                                            {(plan.price ?? 0) > 0 && <p className="text-xs text-gray-400">/month</p>}
                                        </div>
                                    </div>

                                    {plan.description && (
                                        <p className="text-sm text-gray-600 line-clamp-2">{plan.description}</p>
                                    )}

                                    <div className="flex items-center gap-3 text-sm text-gray-600">
                                        <div className="flex items-center gap-1.5">
                                            <Users className="h-4 w-4 text-purple-500" />
                                            <span className="font-semibold text-gray-900">{plan.user_count}</span>
                                            <span>users</span>
                                        </div>
                                        {plan.restriction && (
                                            <>
                                                <span className="text-gray-300">·</span>
                                                <span>{plan.restriction.session_limit ?? "∞"} sessions</span>
                                                <span className="text-gray-300">·</span>
                                                <span>{plan.restriction.facilitator_limit ?? "∞"} facilitators</span>
                                            </>
                                        )}
                                    </div>

                                    {plan.restriction && (
                                        <div className="flex flex-wrap gap-1.5">
                                            {plan.restriction.customisable_sessions && (
                                                <Badge variant="outline" className="text-xs text-green-700 border-green-200 bg-green-50">
                                                    <CheckCircle className="h-3 w-3 mr-1" /> Custom Sessions
                                                </Badge>
                                            )}
                                            {plan.restriction.customisable_facilitators && (
                                                <Badge variant="outline" className="text-xs text-green-700 border-green-200 bg-green-50">
                                                    <CheckCircle className="h-3 w-3 mr-1" /> Custom Facilitators
                                                </Badge>
                                            )}
                                            {plan.restriction.session_reports && (
                                                <Badge variant="outline" className="text-xs text-green-700 border-green-200 bg-green-50">
                                                    <CheckCircle className="h-3 w-3 mr-1" /> Reports
                                                </Badge>
                                            )}
                                            {plan.restriction.data_export && (
                                                <Badge variant="outline" className="text-xs text-green-700 border-green-200 bg-green-50">
                                                    <CheckCircle className="h-3 w-3 mr-1" /> Data Export
                                                </Badge>
                                            )}
                                            {plan.restriction.priority_support && (
                                                <Badge variant="outline" className="text-xs text-green-700 border-green-200 bg-green-50">
                                                    <CheckCircle className="h-3 w-3 mr-1" /> Priority Support
                                                </Badge>
                                            )}
                                        </div>
                                    )}

                                    {plan.stripe_plan_id && (
                                        <div className="flex items-center gap-1.5 text-xs text-gray-400 bg-gray-50 rounded-lg px-2 py-1">
                                            <CreditCard className="h-3 w-3" />
                                            <span className="font-mono truncate">{plan.stripe_plan_id}</span>
                                        </div>
                                    )}

                                    <div className="flex gap-2 mt-auto pt-2 border-t border-gray-100">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1 h-8 text-xs"
                                            onClick={() => openEdit(plan)}
                                        >
                                            <Pencil className="h-3 w-3 mr-1" /> Edit
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50"
                                            onClick={() => setDeletingId(plan.id)}
                                            disabled={plan.user_count > 0}
                                            title={plan.user_count > 0 ? "Cannot delete a plan with active users" : "Delete plan"}
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Create / Edit Dialog */}
            <Dialog
                open={!!editingPlan}
                onOpenChange={open => { if (!open) { setEditingPlan(null); setEditingRestriction(null); setIsCreating(false); } }}
            >
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{isCreating ? "Create New Plan" : `Edit Plan — ${editingPlan?.title}`}</DialogTitle>
                        <DialogDescription>
                            {isCreating ? "Define pricing, type, and feature access for the new plan." : "Update plan details and feature restrictions."}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                        <button
                            onClick={() => setActiveTab("details")}
                            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === "details" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
                        >
                            Plan Details
                        </button>
                        <button
                            onClick={() => setActiveTab("features")}
                            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === "features" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
                        >
                            Features & Limits
                        </button>
                    </div>

                    {activeTab === "details" && editingPlan && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="font-semibold">Plan Name *</Label>
                                    <Input
                                        value={editingPlan.title ?? ""}
                                        onChange={e => setEditingPlan(p => ({ ...p!, title: e.target.value }))}
                                        placeholder="e.g. Professional"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="font-semibold">Plan Type</Label>
                                    <Select
                                        value={editingPlan.plan_type ?? "standard"}
                                        onValueChange={v => setEditingPlan(p => ({ ...p!, plan_type: v }))}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {PLAN_TYPES.map(t => (
                                                <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="font-semibold">Price (per month)</Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        step={0.01}
                                        value={editingPlan.price ?? 0}
                                        onChange={e => setEditingPlan(p => ({ ...p!, price: parseFloat(e.target.value) || 0 }))}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="font-semibold">Currency</Label>
                                    <Select
                                        value={editingPlan.currency ?? "USD"}
                                        onValueChange={v => setEditingPlan(p => ({ ...p!, currency: v }))}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {["USD", "EUR", "GBP", "CAD", "AUD"].map(c => (
                                                <SelectItem key={c} value={c}>{c}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="font-semibold">Description</Label>
                                <Textarea
                                    value={editingPlan.description ?? ""}
                                    onChange={e => setEditingPlan(p => ({ ...p!, description: e.target.value }))}
                                    rows={3}
                                    placeholder="Brief description of this plan..."
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="font-semibold">Stripe Plan ID</Label>
                                <Input
                                    value={editingPlan.stripe_plan_id ?? ""}
                                    onChange={e => setEditingPlan(p => ({ ...p!, stripe_plan_id: e.target.value }))}
                                    placeholder="price_..."
                                    className="font-mono text-sm"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="font-semibold">Valid From</Label>
                                    <Input
                                        type="date"
                                        value={editingPlan.valid_from ? editingPlan.valid_from.split("T")[0] : ""}
                                        onChange={e => setEditingPlan(p => ({ ...p!, valid_from: e.target.value || null }))}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="font-semibold">Valid Until</Label>
                                    <Input
                                        type="date"
                                        value={editingPlan.valid_until ? editingPlan.valid_until.split("T")[0] : ""}
                                        onChange={e => setEditingPlan(p => ({ ...p!, valid_until: e.target.value || null }))}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-100">
                                <div>
                                    <p className="text-sm font-semibold text-gray-800">Mark as Most Popular</p>
                                    <p className="text-xs text-gray-500">Highlights this plan with a "Most Popular" badge</p>
                                </div>
                                <Switch
                                    checked={editingPlan.is_popular ?? false}
                                    onCheckedChange={v => setEditingPlan(p => ({ ...p!, is_popular: v }))}
                                />
                            </div>
                        </div>
                    )}

                    {activeTab === "features" && editingRestriction && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="font-semibold text-xs">Session Limit</Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        value={editingRestriction.session_limit ?? ""}
                                        onChange={e => setEditingRestriction(r => ({ ...r!, session_limit: parseInt(e.target.value) || null }))}
                                        placeholder="∞ unlimited"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="font-semibold text-xs">Facilitator Limit</Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        value={editingRestriction.facilitator_limit ?? ""}
                                        onChange={e => setEditingRestriction(r => ({ ...r!, facilitator_limit: parseInt(e.target.value) || null }))}
                                        placeholder="∞ unlimited"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="font-semibold text-xs">Max Participants</Label>
                                    <Input
                                        type="number"
                                        min={1}
                                        value={editingRestriction.max_participants ?? ""}
                                        onChange={e => setEditingRestriction(r => ({ ...r!, max_participants: parseInt(e.target.value) || null }))}
                                        placeholder="∞ unlimited"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="font-semibold text-xs">Question Limit per Session</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    value={editingRestriction.question_limit ?? 20}
                                    onChange={e => setEditingRestriction(r => ({ ...r!, question_limit: parseInt(e.target.value) || 20 }))}
                                />
                            </div>

                            <Separator />
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Feature Access</p>

                            <div className="space-y-2">
                                <FeatureToggle
                                    label="Customisable Sessions"
                                    description="Users can customise session prompts and settings"
                                    checked={editingRestriction.customisable_sessions ?? false}
                                    onChange={v => setEditingRestriction(r => ({ ...r!, customisable_sessions: v }))}
                                />
                                <FeatureToggle
                                    label="Customisable Facilitators"
                                    description="Users can customise AI facilitator personalities"
                                    checked={editingRestriction.customisable_facilitators ?? false}
                                    onChange={v => setEditingRestriction(r => ({ ...r!, customisable_facilitators: v }))}
                                />
                                <FeatureToggle
                                    label="Saved Sessions"
                                    description="Users can save and revisit past sessions"
                                    checked={editingRestriction.saved_sessions ?? false}
                                    onChange={v => setEditingRestriction(r => ({ ...r!, saved_sessions: v }))}
                                />
                                <FeatureToggle
                                    label="Session Reports"
                                    description="Access to detailed session analytics and reports"
                                    checked={editingRestriction.session_reports ?? false}
                                    onChange={v => setEditingRestriction(r => ({ ...r!, session_reports: v }))}
                                />
                                <FeatureToggle
                                    label="Data Export"
                                    description="Export session data and transcripts"
                                    checked={editingRestriction.data_export ?? false}
                                    onChange={v => setEditingRestriction(r => ({ ...r!, data_export: v }))}
                                />
                                <FeatureToggle
                                    label="Custom Branding"
                                    description="White-label and custom branding options"
                                    checked={editingRestriction.custom_branding ?? false}
                                    onChange={v => setEditingRestriction(r => ({ ...r!, custom_branding: v }))}
                                />
                                <FeatureToggle
                                    label="Priority Support"
                                    description="Dedicated support with faster response times"
                                    checked={editingRestriction.priority_support ?? false}
                                    onChange={v => setEditingRestriction(r => ({ ...r!, priority_support: v }))}
                                />
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setEditingPlan(null); setEditingRestriction(null); setIsCreating(false); }}>
                            Cancel
                        </Button>
                        <Button
                            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                            onClick={() => savePlanMutation.mutate()}
                            disabled={savePlanMutation.isPending || !editingPlan?.title?.trim()}
                        >
                            {savePlanMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            {isCreating ? "Create Plan" : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={!!deletingId} onOpenChange={open => !open && setDeletingId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Plan</AlertDialogTitle>
                        <AlertDialogDescription>
                            This plan and all its feature restrictions will be permanently deleted. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => deletingId && deletePlanMutation.mutate(deletingId)}
                            disabled={deletePlanMutation.isPending}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {deletePlanMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            Delete Plan
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};
