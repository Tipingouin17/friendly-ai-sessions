/**
 * Analytics Dashboard
 *
 * Admin component for the AIfacilitator application.
 */
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
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
    Loader2
} from "lucide-react";
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
import { format, subDays, startOfDay } from "date-fns";

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
    const { data: analytics, isLoading } = useQuery({
        queryKey: ['admin-analytics'],
        queryFn: async (): Promise<AnalyticsData> => {
            // ── Batch all reads into 6 parallel requests ──────────────────────────
            // Previously this fired 44+ sequential HTTP requests (N+1 loops).
            // Now we fetch the raw data once and group client-side.
            const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
            const fourteenDaysAgo = subDays(new Date(), 14).toISOString();

            const [
                { count: totalUsers },
                { count: activeUsers },
                { data: allConversations },
                { count: totalMessages },
                { data: recentProfilesRaw },
                { data: recentConversationsRaw },
                { data: recentMessagesRaw },
                { data: plansData },
            ] = await Promise.all([
                api.from('profiles').select('*', { count: 'exact', head: true }),
                api.from('profiles').select('*', { count: 'exact', head: true }).gte('updated_at', thirtyDaysAgo),
                api.from('conversations').select('id, created_at, status, is_session_ended, session_started, session_duration_minutes, sessions_id, sessions(title), user_id'),
                api.from('messages').select('*', { count: 'exact', head: true }),
                api.from('profiles').select('id, created_at, current_plan_id').gte('created_at', thirtyDaysAgo),
                api.from('conversations').select('id, created_at').gte('created_at', fourteenDaysAgo),
                api.from('messages').select('id, created_at').gte('created_at', fourteenDaysAgo),
                api.from('plans').select('id, title'),
            ]);

            // ── Derived KPIs ───────────────────────────────────────────────────────
            const activeSessions = (allConversations || []).filter(c => (
                !c.is_session_ended &&
                c.session_started === true &&
                (c.status === 'active' || c.status == null)
            )).length;
            const totalSessions = (allConversations || []).length;

            const validDurations = (allConversations || []).filter(
                c => c.session_duration_minutes && c.session_duration_minutes > 0
            );
            const avgSessionDuration = validDurations.length > 0
                ? validDurations.reduce((sum, c) => sum + (c.session_duration_minutes || 0), 0) / validDurations.length
                : 0;

            // ── User growth: cumulative count per day for last 30 days ─────────────
            // We only have profiles created in the last 30 days; for days before that
            // we use (totalUsers - recentProfilesRaw.length) as the baseline.
            const baseline = (totalUsers || 0) - (recentProfilesRaw?.length || 0);
            const userGrowthData: Array<{ date: string; users: number }> = [];
            for (let i = 29; i >= 0; i--) {
                const dayStart = startOfDay(subDays(new Date(), i));
                const dayEnd = startOfDay(subDays(new Date(), i - 1));
                const dayStartMs = dayStart.getTime();
                const dayEndMs = dayEnd.getTime();
                const joinedByDay = (recentProfilesRaw || []).filter(p => {
                    const t = new Date(p.created_at).getTime();
                    return t < dayEndMs;
                }).length;
                userGrowthData.push({
                    date: format(dayStart, 'MMM dd'),
                    users: baseline + joinedByDay
                });
                void dayStartMs; // suppress unused warning
            }

            // ── Sessions by facilitator ────────────────────────────────────────────
            const facilitatorCounts: Record<string, number> = {};
            (allConversations || []).forEach(session => {
                const title = (session.sessions as { title?: string } | null)?.title || 'Other';
                facilitatorCounts[title] = (facilitatorCounts[title] || 0) + 1;
            });
            const sessionsByFacilitator = Object.entries(facilitatorCounts)
                .map(([name, count]) => ({ name, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 10);

            // ── Plan distribution (uses current_plan_id + plans table, not role) ──
            const planCountMap: Record<string, number> = {};
            const allProfilesForPlan = await api.from('profiles').select('current_plan_id');
            (allProfilesForPlan.data || []).forEach(p => {
                const plan = (plansData || []).find(pl => pl.id === p.current_plan_id);
                const label = plan?.title || 'Free';
                planCountMap[label] = (planCountMap[label] || 0) + 1;
            });
            const planDistribution = Object.entries(planCountMap)
                .filter(([, v]) => v > 0)
                .map(([name, value]) => ({ name, value }));

            // ── Recent activity: last 14 days, client-side grouping ────────────────
            const recentActivity: Array<{ date: string; sessions: number; messages: number }> = [];
            for (let i = 13; i >= 0; i--) {
                const dayStart = startOfDay(subDays(new Date(), i));
                const dayEnd = startOfDay(subDays(new Date(), i - 1));
                const dayStartMs = dayStart.getTime();
                const dayEndMs = dayEnd.getTime();
                const sessions = (recentConversationsRaw || []).filter(c => {
                    const t = new Date(c.created_at).getTime();
                    return t >= dayStartMs && t < dayEndMs;
                }).length;
                const messages = (recentMessagesRaw || []).filter(m => {
                    const t = new Date(m.created_at).getTime();
                    return t >= dayStartMs && t < dayEndMs;
                }).length;
                recentActivity.push({ date: format(dayStart, 'MMM dd'), sessions, messages });
            }

            return {
                totalUsers: totalUsers || 0,
                activeUsers: activeUsers || 0,
                totalSessions,
                activeSessions,
                totalMessages: totalMessages || 0,
                avgSessionDuration: Math.round(avgSessionDuration),
                userGrowth: userGrowthData,
                sessionsByFacilitator,
                planDistribution,
                recentActivity
            };
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
                            {analytics?.totalUsers.toLocaleString()}
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
                            {analytics?.totalSessions.toLocaleString()}
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
                            {analytics?.totalMessages.toLocaleString()}
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
