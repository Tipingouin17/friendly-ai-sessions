/**
 * Revenue Dashboard
 *
 * Admin component for the AIfacilitator application.
 */
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    DollarSign,
    TrendingUp,
    CreditCard,
    AlertCircle,
    Loader2,
    Users,
    Calendar
} from "lucide-react";
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from "recharts";
import { format, subDays, startOfMonth, endOfMonth, startOfDay } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface RevenueData {
    mrr: number;
    arr: number;
    totalRevenue: number;
    activeSubscriptions: number;
    churnRate: number;
    revenueByPlan: Array<{ plan: string; revenue: number; users: number }>;
    monthlyRevenue: Array<{ month: string; revenue: number; newUsers: number }>;
    recentTransactions: Array<{
        id: string;
        user_email: string;
        plan: string;
        amount: number;
        date: string;
        status: string;
    }>;
}

export const RevenueDashboard = () => {
    const { data: revenue, isLoading } = useQuery({
        queryKey: ['admin-revenue'],
        queryFn: async (): Promise<RevenueData> => {
            // Get all profiles with plan info (email and full_name for transaction display)
            const { data: profiles } = await api
                .from('profiles')
                .select(`
          id,
          email,
          full_name,
          role,
          current_plan_id,
          created_at,
          updated_at,
          subscription_status
        `);

            // Get plan pricing
            const { data: plans } = await api
                .from('plans')
                .select('id, title, price');

            // Calculate MRR (Monthly Recurring Revenue)
            let mrr = 0;
            let activeSubscriptions = 0;
            const revenueByPlan: Record<string, { revenue: number; users: number }> = { /* no-op */ };

            profiles?.forEach(profile => {
                if (profile.subscription_status === 'active' && profile.current_plan_id) {
                    const plan = plans?.find(p => p.id === profile.current_plan_id);
                    if (plan && plan.price) {
                        mrr += plan.price;
                        activeSubscriptions++;

                        const planName = plan.title || 'Unknown';
                        if (!revenueByPlan[planName]) {
                            revenueByPlan[planName] = { revenue: 0, users: 0 };
                        }
                        revenueByPlan[planName].revenue += plan.price;
                        revenueByPlan[planName].users += 1;
                    }
                }
            });

            const arr = mrr * 12;

            // Calculate churn rate (users who cancelled in last 30 days)
            const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
            const { count: totalUsers } = await api
                .from('profiles')
                .select('*', { count: 'exact', head: true });

            const { count: churnedUsers } = await api
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .eq('subscription_status', 'canceled')
                .gte('updated_at', thirtyDaysAgo);

            const churnRate = totalUsers && totalUsers > 0
                ? ((churnedUsers || 0) / totalUsers) * 100
                : 0;

            // Revenue by plan
            const revenueByPlanArray = Object.entries(revenueByPlan).map(([plan, data]) => ({
                plan,
                revenue: data.revenue,
                users: data.users
            }));

            // Monthly revenue for last 6 months — single query, client-side grouping.
            // Fetch all profiles created in the last 6 months in one request.
            const sixMonthsAgo = startOfMonth(subDays(new Date(), 5 * 30)).toISOString();
            const { data: recentProfiles } = await api
                .from('profiles')
                .select('id, created_at, current_plan_id, subscription_status')
                .gte('created_at', sixMonthsAgo);

            const monthlyRevenue: Array<{ month: string; revenue: number; newUsers: number }> = [];
            for (let i = 5; i >= 0; i--) {
                const monthStart = startOfMonth(subDays(new Date(), i * 30));
                const monthEnd = endOfMonth(monthStart);
                const monthStartMs = monthStart.getTime();
                const monthEndMs = monthEnd.getTime();

                const monthProfiles = (recentProfiles || []).filter(p => {
                    const t = new Date(p.created_at).getTime();
                    return t >= monthStartMs && t <= monthEndMs;
                });

                // Calculate actual MRR contribution from users who joined this month
                // and are still on a paid plan (more accurate than a flat $29 estimate)
                const monthRevenue = monthProfiles.reduce((sum, p) => {
                    if (p.subscription_status === 'active' && p.current_plan_id) {
                        const plan = plans?.find(pl => pl.id === p.current_plan_id);
                        return sum + (plan?.price || 0);
                    }
                    return sum;
                }, 0);

                monthlyRevenue.push({
                    month: format(monthStart, 'MMM yyyy'),
                    revenue: monthRevenue,
                    newUsers: monthProfiles.length
                });
            }

            // Recent subscription activity: profiles with active/canceled status,
            // sorted by updated_at descending (most recent subscription change first).
            // This is the best available data without a dedicated payments table.
            const recentTransactions = (profiles || [])
                .filter(p => p.subscription_status === 'active' || p.subscription_status === 'canceled')
                .sort((a, b) => new Date(b.updated_at ?? b.created_at).getTime() - new Date(a.updated_at ?? a.created_at).getTime())
                .slice(0, 10)
                .map((profile) => {
                    const plan = plans?.find(p => p.id === profile.current_plan_id);
                    const displayEmail = (profile as { email?: string }).email
                        || `user_${profile.id.substring(0, 8)}`;
                    return {
                        id: profile.id,
                        user_email: displayEmail,
                        plan: plan?.title || 'Unknown',
                        amount: plan?.price || 0,
                        date: (profile as { updated_at?: string }).updated_at ?? profile.created_at,
                        status: profile.subscription_status === 'active' ? 'active' : 'canceled'
                    };
                });

            return {
                mrr,
                arr,
                totalRevenue: mrr * 6, // Simplified: 6 months of MRR
                activeSubscriptions,
                churnRate,
                revenueByPlan: revenueByPlanArray,
                monthlyRevenue,
                recentTransactions
            };
        },
        staleTime: 5 * 60 * 1000, // 5 minutes — matches refetchInterval
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

    return (
        <div className="space-y-6">
            {/* Revenue KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white">
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-green-600" />
                            Monthly Recurring Revenue
                        </CardDescription>
                        <CardTitle className="text-3xl font-bold text-green-900">
                            ${revenue?.mrr.toLocaleString()}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-green-600">
                            MRR from active subscriptions
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-emerald-600" />
                            Annual Recurring Revenue
                        </CardDescription>
                        <CardTitle className="text-3xl font-bold text-emerald-900">
                            ${revenue?.arr.toLocaleString()}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-emerald-600">
                            ARR (MRR × 12)
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-blue-600" />
                            Active Subscriptions
                        </CardDescription>
                        <CardTitle className="text-3xl font-bold text-blue-900">
                            {revenue?.activeSubscriptions}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-blue-600">
                            Paying customers
                        </p>
                    </CardContent>
                </Card>

                <Card className={revenue && revenue.churnRate > 5 ? 'border-red-200 bg-gradient-to-br from-red-50 to-white' : 'border-amber-200 bg-gradient-to-br from-amber-50 to-white'}>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <AlertCircle className={revenue && revenue.churnRate > 5 ? 'h-4 w-4 text-red-600' : 'h-4 w-4 text-amber-600'} />
                            Churn Rate (30d)
                        </CardDescription>
                        <CardTitle className={revenue && revenue.churnRate > 5 ? 'text-3xl font-bold text-red-900' : 'text-3xl font-bold text-amber-900'}>
                            {revenue?.churnRate.toFixed(1)}%
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className={revenue && revenue.churnRate > 5 ? 'text-sm text-red-600' : 'text-sm text-amber-600'}>
                            {revenue && revenue.churnRate > 5 ? 'High churn!' : 'Healthy'}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Alerts */}
            {revenue && revenue.churnRate > 5 && (
                <Alert className="border-red-200 bg-red-50">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                        <strong>High Churn Alert:</strong> Your churn rate is above 5%. Consider implementing retention campaigns or investigating user feedback.
                    </AlertDescription>
                </Alert>
            )}

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Monthly Revenue Trend */}
                <Card className="border-green-200">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-green-600" />
                            <CardTitle>Revenue Trend (6 Months)</CardTitle>
                        </div>
                        <CardDescription>Monthly revenue and new user acquisition</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {revenue?.monthlyRevenue?.every(m => m.revenue === 0 && m.newUsers === 0) ? (
                            <div className="flex flex-col items-center justify-center h-[300px] text-gray-400">
                                <TrendingUp className="h-12 w-12 mb-3 opacity-20" />
                                <p className="text-sm font-medium">No revenue data yet</p>
                                <p className="text-xs mt-1">Revenue will appear here once subscriptions are active</p>
                            </div>
                        ) : (
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={revenue?.monthlyRevenue}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis yAxisId="left" />
                                <YAxis yAxisId="right" orientation="right" />
                                <Tooltip />
                                <Legend />
                                <Line
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#10b981"
                                    strokeWidth={2}
                                    name="Revenue ($)"
                                />
                                <Line
                                    yAxisId="right"
                                    type="monotone"
                                    dataKey="newUsers"
                                    stroke="#3b82f6"
                                    strokeWidth={2}
                                    name="New Users"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                {/* Revenue by Plan */}
                <Card className="border-blue-200">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <DollarSign className="h-5 w-5 text-blue-600" />
                            <CardTitle>Revenue by Plan</CardTitle>
                        </div>
                        <CardDescription>Monthly revenue breakdown</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {!revenue?.revenueByPlan?.length ? (
                            <div className="flex flex-col items-center justify-center h-[300px] text-gray-400">
                                <DollarSign className="h-12 w-12 mb-3 opacity-20" />
                                <p className="text-sm font-medium">No plan revenue data yet</p>
                                <p className="text-xs mt-1">Revenue breakdown will appear once paid subscriptions are active</p>
                            </div>
                        ) : (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={revenue?.revenueByPlan}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="plan" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="revenue" fill="#10b981" name="Revenue ($)" />
                                <Bar dataKey="users" fill="#3b82f6" name="Users" />
                            </BarChart>
                        </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Recent Transactions */}
            <Card className="border-purple-200">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-purple-600" />
                        <CardTitle>Recent Transactions</CardTitle>
                    </div>
                    <CardDescription>Latest subscription activities</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {revenue?.recentTransactions.map((txn) => (
                            <div key={txn.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-green-100 rounded-full">
                                        <DollarSign className="h-4 w-4 text-green-600" />
                                    </div>
                                    <div>
                                        <p className="font-medium">{txn.user_email}</p>
                                        <p className="text-sm text-gray-500">{txn.plan}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-semibold text-green-600">${txn.amount}</p>
                                    <p className="text-xs text-gray-500">
                                        {format(new Date(txn.date), 'MMM d, yyyy')}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
