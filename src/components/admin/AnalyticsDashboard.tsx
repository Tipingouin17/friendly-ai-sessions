/**
 * Analytics Dashboard
 *
 * Admin component for the AIfacilitator application.
 */
import { useQuery } from "@tanstack/react-query";
import { EDGE_FUNCTION_URL } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    TrendingUp,
    Users,
    DollarSign,
    Activity,
    MessageSquare,
    Calendar,
    Zap,
    Target,
    Loader2,
    AlertCircle,
    RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from "recharts";


interface AnalyticsData {
    totalUsers: number;
    activeUsers: number;
    totalSessions: number;
    activeSessions: number;
    totalMessages: number;
    avgSessionDuration: number;
    userGrowth: Array<{ date: string; users: number }>;
    sessionsByFacilitator: Array<{ name: string; count: number }>;
    planDistribution: Array<{ name: string; value: number }>;
    recentActivity: Array<{ date: string; sessions: number; messages: number }>;
}

const COLORS = ['#8b5cf6', '#6366f1', '#3b82f6', '#06b6d4', '#10b981'];

export const AnalyticsDashboard = () => {
    // Fetch analytics data
    const { data: analytics, isLoading, isError, error, refetch } = useQuery({
        queryKey: ['admin-analytics'],
        queryFn: async (): Promise<AnalyticsData> => {
            // Fetch all KPI data from the backend in a single authenticated call.
            // This bypasses Supabase RLS restrictions and works correctly on all devices.
            const token = (() => {
                try {
                    const session = JSON.parse(localStorage.getItem("mf_session") || "null");
                    return session?.access_token || "";
                } catch { return ""; }
            })();
            const res = await fetch(`${EDGE_FUNCTION_URL}/admin/analytics`, {
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { "Authorization": `Bearer ${token}` } : {}),
                },
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err?.detail || `Analytics request failed with HTTP ${res.status}`);
            }
            return res.json() as Promise<AnalyticsData>;
        },
        staleTime: 60_000,       // 1 minute — matches refetchInterval
        refetchInterval: 60_000,
        refetchOnWindowFocus: false,
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            </div>
        );
    }

    if (isError) {
        return (
            <div className="flex flex-col items-center justify-center gap-4 p-12 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
                    <AlertCircle className="h-7 w-7 text-red-500" />
                </div>
                <div>
                    <p className="text-base font-semibold text-slate-900">Failed to load analytics</p>
                    <p className="mt-1 text-sm text-slate-500">{(error as Error)?.message || 'Could not reach the analytics server. Check that the Railway backend is running.'}</p>
                </div>
                <Button variant="outline" onClick={() => void refetch()} className="gap-2">
                    <RefreshCw className="h-4 w-4" /> Retry
                </Button>
            </div>
        );
    }

    const planDistribution = analytics?.planDistribution ?? [];
    const planDistributionTotal = planDistribution.reduce((sum, item) => sum + item.value, 0);
    const hasPlanDistribution = planDistributionTotal > 0;
    const formatPercent = (value: number) => {
        if (!planDistributionTotal) return '0%';
        return `${((value / planDistributionTotal) * 100).toFixed(1)}%`;
    };
    const truncateLabel = (label: string, maxLength = 26) => (
        label.length > maxLength ? `${label.slice(0, maxLength - 1)}…` : label
    );

    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-purple-600" />
                            Total Users
                        </CardDescription>
                        <CardTitle className="text-3xl font-bold text-purple-900">
                            {analytics?.totalUsers?.toLocaleString() ?? '—'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-purple-600">
                            {analytics?.activeUsers} active (30d)
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50 to-white">
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <Activity className="h-4 w-4 text-indigo-600" />
                            Total Sessions
                        </CardDescription>
                        <CardTitle className="text-3xl font-bold text-indigo-900">
                            {analytics?.totalSessions?.toLocaleString() ?? '—'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-indigo-600">
                            {analytics?.activeSessions} currently active
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4 text-blue-600" />
                            Total Messages
                        </CardDescription>
                        <CardTitle className="text-3xl font-bold text-blue-900">
                            {analytics?.totalMessages?.toLocaleString() ?? '—'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-blue-600">
                            Platform-wide engagement
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-cyan-200 bg-gradient-to-br from-cyan-50 to-white">
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <Zap className="h-4 w-4 text-cyan-600" />
                            Avg Session Duration
                        </CardDescription>
                        <CardTitle className="text-3xl font-bold text-cyan-900">
                            {analytics?.avgSessionDuration}m
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-cyan-600">
                            Minutes per session
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* User Growth */}
                <Card className="border-purple-200">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-purple-600" />
                            <CardTitle>User Growth (30 Days)</CardTitle>
                        </div>
                        <CardDescription>Cumulative user registrations</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={analytics?.userGrowth}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="users"
                                    stroke="#8b5cf6"
                                    strokeWidth={2}
                                    name="Total Users"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Plan Distribution */}
                <Card className="border-indigo-200">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Target className="h-5 w-5 text-indigo-600" />
                            <CardTitle>Plan Distribution</CardTitle>
                        </div>
                        <CardDescription>Users by subscription tier</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {hasPlanDistribution ? (
                            <div className="grid grid-cols-1 xl:grid-cols-[minmax(220px,1fr)_220px] gap-4 items-center">
                                <div className="min-h-[260px]">
                                    <ResponsiveContainer width="100%" height={260}>
                                        <PieChart margin={{ top: 12, right: 12, bottom: 12, left: 12 }}>
                                            <Pie
                                                data={planDistribution}
                                                cx="50%"
                                                cy="50%"
                                                labelLine={false}
                                                outerRadius={92}
                                                innerRadius={48}
                                                minAngle={4}
                                                fill="#8884d8"
                                                dataKey="value"
                                            >
                                                {planDistribution.map((_, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                formatter={(value: number, _name, item) => [
                                                    `${value.toLocaleString()} users (${formatPercent(value)})`,
                                                    item.payload.name,
                                                ]}
                                            />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="space-y-2 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
                                        Plan breakdown
                                    </p>
                                    {planDistribution.map((item, index) => (
                                        <div key={item.name} className="flex items-center justify-between gap-3 text-sm">
                                            <div className="flex min-w-0 items-center gap-2">
                                                <span
                                                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                                                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                                />
                                                <span className="truncate font-medium text-gray-700" title={item.name}>
                                                    {item.name}
                                                </span>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-semibold text-gray-900">{item.value.toLocaleString()}</p>
                                                <p className="text-xs text-gray-500">{formatPercent(item.value)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="flex h-[260px] items-center justify-center rounded-xl border border-dashed border-indigo-200 bg-indigo-50/40 text-sm text-gray-500">
                                No plan data available yet.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Activity */}
                <Card className="border-blue-200">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-blue-600" />
                            <CardTitle>Recent Activity (14 Days)</CardTitle>
                        </div>
                        <CardDescription>Sessions and messages created</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={analytics?.recentActivity}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="sessions" fill="#3b82f6" name="Sessions" />
                                <Bar dataKey="messages" fill="#06b6d4" name="Messages" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Top Facilitators */}
                <Card className="border-cyan-200">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <DollarSign className="h-5 w-5 text-cyan-600" />
                            <CardTitle>Top Facilitators</CardTitle>
                        </div>
                        <CardDescription>Most used session types</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart
                                data={analytics?.sessionsByFacilitator}
                                layout="vertical"
                                margin={{ top: 8, right: 24, bottom: 8, left: 16 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" allowDecimals={false} />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    width={170}
                                    tickFormatter={(value: string) => truncateLabel(value)}
                                />
                                <Tooltip formatter={(value: number) => [value.toLocaleString(), 'Sessions']} />
                                <Bar dataKey="count" fill="#10b981" name="Sessions" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
