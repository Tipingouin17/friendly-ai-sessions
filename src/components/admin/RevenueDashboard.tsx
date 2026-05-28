/**
 * Revenue Dashboard
 *
 * Live admin revenue view backed by the server-side cost analytics endpoint.
 * This component intentionally avoids fabricated transaction rows or profile-derived
 * revenue estimates when the database does not expose a payment ledger.
 */
import { useQuery } from "@tanstack/react-query";
import { EDGE_FUNCTION_URL } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    AlertCircle,
    CreditCard,
    DollarSign,
    Loader2,
    TrendingUp,
    Users,
} from "lucide-react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

interface CostSummary {
    monthly_revenue_eur: number;
    gross_margin_pct: number | null;
    total_paid_subscribers: number;
    monthly_growth_rate_pct: number;
}

interface RevenuePlan {
    plan_name: string;
    plan_price_eur: number;
    subscriber_count: number;
    monthly_revenue_eur: number;
}

interface SubscriberGrowth {
    month: string;
    new_paid_subscribers: number;
}

interface MrrProjection {
    month: string;
    projected_mrr_eur: number;
    projected_arr_eur: number;
}

interface RevenueAnalyticsData {
    summary: CostSummary;
    revenue_by_plan: RevenuePlan[];
    subscriber_growth: SubscriberGrowth[];
    mrr_projection: MrrProjection[];
}

function getAdminAccessToken(): string {
    try {
        const session = JSON.parse(localStorage.getItem("mf_session") || "null");
        return session?.access_token || "";
    } catch {
        return "";
    }
}

const fmt = {
    eur: (value: number | null | undefined) => `€${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    pct: (value: number | null | undefined) => value == null ? "—" : `${Number(value).toFixed(1)}%`,
    num: (value: number | null | undefined) => Number(value || 0).toLocaleString(),
};

export const RevenueDashboard = () => {
    const { data: revenue, isLoading, error } = useQuery<RevenueAnalyticsData>({
        queryKey: ["admin-revenue-live"],
        queryFn: async () => {
            const token = getAdminAccessToken();
            const res = await fetch(`${EDGE_FUNCTION_URL}/admin/cost-analytics`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                const detail = body?.detail?.message || body?.detail || body?.message;
                throw new Error(detail || `Failed to load live revenue analytics (HTTP ${res.status})`);
            }
            return res.json();
        },
        staleTime: 60_000,
        refetchInterval: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            </div>
        );
    }

    if (error || !revenue) {
        return (
            <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                    Failed to load live revenue analytics: {error instanceof Error ? error.message : "Unknown error"}
                </AlertDescription>
            </Alert>
        );
    }

    const { summary, revenue_by_plan, subscriber_growth, mrr_projection } = revenue;
    const arr = Number(summary.monthly_revenue_eur || 0) * 12;
    const hasRevenueByPlan = revenue_by_plan.some(plan => Number(plan.monthly_revenue_eur || 0) > 0 || Number(plan.subscriber_count || 0) > 0);
    const hasSubscriberGrowth = subscriber_growth.some(month => Number(month.new_paid_subscribers || 0) > 0);
    const hasProjection = mrr_projection.some(month => Number(month.projected_mrr_eur || 0) > 0 || Number(month.projected_arr_eur || 0) > 0);

    return (
        <div className="space-y-6">
            <Alert className="border-blue-200 bg-blue-50">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                    This page now uses the live backend <strong>admin cost analytics</strong> endpoint. It shows factual subscription aggregates from the database and no longer fabricates recent transaction rows when no payments ledger is available.
                </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white">
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-green-600" />
                            Monthly Recurring Revenue
                        </CardDescription>
                        <CardTitle className="text-3xl font-bold text-green-900">
                            {fmt.eur(summary.monthly_revenue_eur)}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-green-600">Live MRR from active paid subscriptions</p>
                    </CardContent>
                </Card>

                <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-emerald-600" />
                            Annual Recurring Revenue
                        </CardDescription>
                        <CardTitle className="text-3xl font-bold text-emerald-900">
                            {fmt.eur(arr)}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-emerald-600">ARR calculated from live MRR × 12</p>
                    </CardContent>
                </Card>

                <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-blue-600" />
                            Paid Subscribers
                        </CardDescription>
                        <CardTitle className="text-3xl font-bold text-blue-900">
                            {fmt.num(summary.total_paid_subscribers)}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-blue-600">Live active paid subscriber count</p>
                    </CardContent>
                </Card>

                <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-purple-600" />
                            Monthly Growth
                        </CardDescription>
                        <CardTitle className="text-3xl font-bold text-purple-900">
                            {fmt.pct(summary.monthly_growth_rate_pct)}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-purple-600">Paid subscriber growth rate</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-green-200">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-green-600" />
                            <CardTitle>Paid Subscriber Growth</CardTitle>
                        </div>
                        <CardDescription>Live monthly count of new paid subscribers from database records</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {!hasSubscriberGrowth ? (
                            <div className="flex flex-col items-center justify-center h-[300px] text-gray-400">
                                <TrendingUp className="h-12 w-12 mb-3 opacity-20" />
                                <p className="text-sm font-medium">No paid subscriber growth data yet</p>
                                <p className="text-xs mt-1">The chart will populate when paid subscriptions are recorded</p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={subscriber_growth}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="month" />
                                    <YAxis allowDecimals={false} />
                                    <Tooltip />
                                    <Legend />
                                    <Line
                                        type="monotone"
                                        dataKey="new_paid_subscribers"
                                        stroke="#3b82f6"
                                        strokeWidth={2}
                                        name="New Paid Subscribers"
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-blue-200">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <CreditCard className="h-5 w-5 text-blue-600" />
                            <CardTitle>Revenue by Plan</CardTitle>
                        </div>
                        <CardDescription>Live subscriber counts and MRR by subscription plan</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {!hasRevenueByPlan ? (
                            <div className="flex flex-col items-center justify-center h-[300px] text-gray-400">
                                <CreditCard className="h-12 w-12 mb-3 opacity-20" />
                                <p className="text-sm font-medium">No active paid subscription data</p>
                                <p className="text-xs mt-1">Plan revenue appears when paying subscribers exist</p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={revenue_by_plan}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="plan_name" />
                                    <YAxis yAxisId="left" />
                                    <YAxis yAxisId="right" orientation="right" allowDecimals={false} />
                                    <Tooltip formatter={(value, name) => name === "Monthly Revenue (€)" ? fmt.eur(Number(value)) : value} />
                                    <Legend />
                                    <Bar yAxisId="left" dataKey="monthly_revenue_eur" fill="#10b981" name="Monthly Revenue (€)" />
                                    <Bar yAxisId="right" dataKey="subscriber_count" fill="#3b82f6" name="Subscribers" />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Card className="border-purple-200">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-purple-600" />
                        <CardTitle>MRR Projection</CardTitle>
                    </div>
                    <CardDescription>Backend-calculated projection from live subscriber and plan data</CardDescription>
                </CardHeader>
                <CardContent>
                    {!hasProjection ? (
                        <div className="flex flex-col items-center justify-center h-[260px] text-gray-400">
                            <TrendingUp className="h-12 w-12 mb-3 opacity-20" />
                            <p className="text-sm font-medium">No projection available yet</p>
                            <p className="text-xs mt-1">Projection appears when the live revenue baseline is non-zero</p>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={320}>
                            <LineChart data={mrr_projection}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip formatter={(value) => fmt.eur(Number(value))} />
                                <Legend />
                                <Line type="monotone" dataKey="projected_mrr_eur" stroke="#8b5cf6" strokeWidth={2} name="Projected MRR" />
                                <Line type="monotone" dataKey="projected_arr_eur" stroke="#06b6d4" strokeWidth={2} name="Projected ARR" />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </CardContent>
            </Card>

            <Card className="border-gray-200">
                <CardHeader>
                    <CardTitle>Live Data Coverage</CardTitle>
                    <CardDescription>What the database currently exposes for this revenue page</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                            <p className="font-semibold text-green-900">Live</p>
                            <p className="text-green-700 mt-1">Subscription MRR, ARR, paid subscriber count, growth, and revenue by plan.</p>
                        </div>
                        <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                            <p className="font-semibold text-blue-900">Backend-derived</p>
                            <p className="text-blue-700 mt-1">MRR/ARR projections are calculated server-side from live subscription records.</p>
                        </div>
                        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                            <p className="font-semibold text-amber-900">Not shown as live</p>
                            <p className="text-amber-700 mt-1">Payment transaction history is omitted because no dedicated live payment ledger endpoint is available.</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
