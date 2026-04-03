/**
 * Plan Management
 *
 * Admin component for the AIfacilitator application.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, DollarSign, Package } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface Plan {
    id: number;
    title: string; // Changed from name to title
    price: number;
    description?: string | null; // Made optional to match DB schema
    stripe_plan_id: string | null; // Changed from stripe_price_id to stripe_plan_id
}

interface PlanRestriction {
    id: number;
    plan_id: number;
    session_limit: number | null; // Changed from max_sessions
    facilitator_limit: number | null; // Changed from max_facilitators
    max_participants: number | null; // Changed from max_participants_per_session
    session_reports: boolean | null;
    custom_branding?: boolean | null; // Made optional to match DB schema
    priority_support?: boolean | null; // Made optional to match DB schema
}

export const PlanManagement = () => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);

    // Fetch plans
    const { data: plans, isLoading: isLoadingPlans } = useQuery({
        queryKey: ['admin-plans'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('plans')
                .select('*')
                .order('price', { ascending: true });

            if (error) throw error;
            return data as unknown as Plan[];
        }
    });

    // Fetch plan restrictions
    const { data: restrictions, isLoading: isLoadingRestrictions } = useQuery({
        queryKey: ['admin-plan-restrictions'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('plan_restrictions')
                .select('*');

            if (error) throw error;
            return data as unknown as PlanRestriction[];
        }
    });

    // Update plan mutation
    const updatePlanMutation = useMutation({
        mutationFn: async ({ planId, updates }: { planId: number; updates: Partial<Plan> }) => {
            const { error } = await supabase
                .from('plans')
                .update(updates)
                .eq('id', planId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-plans'] });
            toast({
                title: "Success",
                description: "Plan updated successfully",
            });
        },
        onError: (error) => {
            toast({
                title: "Error",
                description: `Failed to update plan: ${error.message}`,
                variant: "destructive",
            });
        }
    });

    // Update restrictions mutation
    const updateRestrictionsMutation = useMutation({
        mutationFn: async ({ restrictionId, updates }: { restrictionId: number; updates: Partial<PlanRestriction> }) => {
            const { error } = await supabase
                .from('plan_restrictions')
                .update(updates)
                .eq('id', restrictionId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-plan-restrictions'] });
            toast({
                title: "Success",
                description: "Plan restrictions updated successfully",
            });
        },
        onError: (error) => {
            toast({
                title: "Error",
                description: `Failed to update restrictions: ${error.message}`,
                variant: "destructive",
            });
        }
    });

    const selectedPlan = plans?.find(p => p.id === selectedPlanId);
    const selectedRestriction = restrictions?.find(r => r.plan_id === selectedPlanId);

    if (isLoadingPlans || isLoadingRestrictions) {
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
                        <Package className="h-6 w-6 text-purple-600" />
                        <CardTitle className="text-2xl">Subscription Plans</CardTitle>
                    </div>
                    <CardDescription>
                        Manage pricing and features for subscription tiers
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                    {/* Plan Selection */}
                    <div className="grid md:grid-cols-3 gap-4">
                        {plans?.map((plan) => (
                            <Card
                                key={plan.id}
                                className={`cursor-pointer transition-all ${selectedPlanId === plan.id
                                    ? 'ring-2 ring-purple-600 shadow-lg'
                                    : 'hover:shadow-md'
                                    }`}
                                onClick={() => setSelectedPlanId(plan.id)}
                            >
                                <CardHeader>
                                    <CardTitle className="text-lg">{plan.title}</CardTitle>
                                    <div className="flex items-baseline gap-1">
                                        <DollarSign className="h-5 w-5 text-gray-500" />
                                        <span className="text-3xl font-bold">{plan.price}</span>
                                        <span className="text-gray-500">/month</span>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-gray-600">{plan.description || 'No description'}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Plan Editor */}
                    {selectedPlan && selectedRestriction && (
                        <div className="border-t pt-6 space-y-6">
                            <h3 className="text-lg font-semibold">Edit {selectedPlan.title}</h3>

                            {/* Basic Info */}
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="plan-name">Plan Name</Label>
                                    <Input
                                        id="plan-name"
                                        value={selectedPlan.title}
                                        onChange={(e) => {
                                            updatePlanMutation.mutate({
                                                planId: selectedPlan.id,
                                                updates: { title: e.target.value }
                                            });
                                        }}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="plan-price">Price ($/month)</Label>
                                    <Input
                                        id="plan-price"
                                        type="number"
                                        value={selectedPlan.price}
                                        onChange={(e) => {
                                            updatePlanMutation.mutate({
                                                planId: selectedPlan.id,
                                                updates: { price: parseFloat(e.target.value) }
                                            });
                                        }}
                                    />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="plan-description">Description</Label>
                                    <Input
                                        id="plan-description"
                                        value={selectedPlan.description || ''}
                                        onChange={(e) => {
                                            updatePlanMutation.mutate({
                                                planId: selectedPlan.id,
                                                updates: { description: e.target.value }
                                            });
                                        }}
                                        placeholder="Enter plan description..."
                                    />
                                </div>
                            </div>

                            {/* Restrictions */}
                            <div className="space-y-4">
                                <h4 className="font-semibold">Plan Limits</h4>
                                <div className="grid md:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="max-sessions">Max Sessions</Label>
                                        <Input
                                            id="max-sessions"
                                            type="number"
                                            value={selectedRestriction.session_limit || ''}
                                            onChange={(e) => {
                                                updateRestrictionsMutation.mutate({
                                                    restrictionId: selectedRestriction.id,
                                                    updates: { session_limit: parseInt(e.target.value) || null }
                                                });
                                            }}
                                            placeholder="Unlimited"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="max-facilitators">Max Facilitators</Label>
                                        <Input
                                            id="max-facilitators"
                                            type="number"
                                            value={selectedRestriction.facilitator_limit || ''}
                                            onChange={(e) => {
                                                updateRestrictionsMutation.mutate({
                                                    restrictionId: selectedRestriction.id,
                                                    updates: { facilitator_limit: parseInt(e.target.value) || null }
                                                });
                                            }}
                                            placeholder="Unlimited"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="max-participants">Max Participants/Session</Label>
                                        <Input
                                            id="max-participants"
                                            type="number"
                                            value={selectedRestriction.max_participants || ''}
                                            onChange={(e) => {
                                                updateRestrictionsMutation.mutate({
                                                    restrictionId: selectedRestriction.id,
                                                    updates: { max_participants: parseInt(e.target.value) || null }
                                                });
                                            }}
                                            placeholder="Unlimited"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Features */}
                            <div className="space-y-4">
                                <h4 className="font-semibold">Features</h4>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <Label htmlFor="session-reports" className="cursor-pointer">
                                            Session Reports
                                        </Label>
                                        <Switch
                                            id="session-reports"
                                            checked={selectedRestriction.session_reports || false}
                                            onCheckedChange={(checked) => {
                                                updateRestrictionsMutation.mutate({
                                                    restrictionId: selectedRestriction.id,
                                                    updates: { session_reports: checked }
                                                });
                                            }}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <Label htmlFor="custom-branding" className="cursor-pointer">
                                            Custom Branding
                                        </Label>
                                        <Switch
                                            id="custom-branding"
                                            checked={selectedRestriction.custom_branding || false}
                                            onCheckedChange={(checked) => {
                                                updateRestrictionsMutation.mutate({
                                                    restrictionId: selectedRestriction.id,
                                                    updates: { custom_branding: checked }
                                                });
                                            }}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <Label htmlFor="priority-support" className="cursor-pointer">
                                            Priority Support
                                        </Label>
                                        <Switch
                                            id="priority-support"
                                            checked={selectedRestriction.priority_support || false}
                                            onCheckedChange={(checked) => {
                                                updateRestrictionsMutation.mutate({
                                                    restrictionId: selectedRestriction.id,
                                                    updates: { priority_support: checked }
                                                });
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};
