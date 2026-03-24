import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
            // Total users
            const { count: totalUsers } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true });

            // Active users (logged in last 30 days)
            const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
            const { count: activeUsers } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .gte('updated_at', thirtyDaysAgo);

            // Total conversations
            const { count: totalSessions } = await supabase
                .from('conversations')
                .select('*', { count: 'exact', head: true });

            // Active sessions
            const { count: activeSessions } = await supabase
                .from('conversations')
                .select('*', { count: 'exact', head: true })
                .eq('is_session_ended', false);

            // Total messages
            const { count: totalMessages } = await supabase
                .from('messages')
                .select('*', { count: 'exact', head: true });

            // Average session duration
            const { data: durationData } = await supabase
                .from('conversations')
                .select('session_duration_minutes')
                .not('session_duration_minutes', 'is', null);

            const avgSessionDuration = durationData && durationData.length > 0
                ? durationData.reduce((sum, s) => sum + (s.session_duration_minutes || 0), 0) / durationData.length
                : 0;

            // User growth (last 30 days)
            const userGrowthData: Array<{ date: string; users: number }> = [];
            for (let i = 29; i >= 0; i--) {
                const date = startOfDay(subDays(new Date(), i));
                const { count } = await supabase
                    .from('profiles')
                    .select('*', { count: 'exact', head: true })
                    .lte('created_at', date.toISOString());

                userGrowthData.push({
                    date: format(date, 'MMM dd'),
                    users: count || 0
                });
            }

            // Sessions by facilitator
            const { data: sessionsData } = await supabase
                .from('conversations')
                .select(`
          sessions_id,
          sessions (
            title
          )
        `);

            const facilitatorCounts: Record<string, number> = { /* no-op */ };
            sessionsData?.forEach(session => {
                const title = session.sessions?.title || 'Unknown';
                facilitatorCounts[title] = (facilitatorCounts[title] || 0) + 1;
            });

            const sessionsByFacilitator = Object.entries(facilitatorCounts)
                .map(([name, count]) => ({ name, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 10);

            // Plan distribution
            const { data: planData } = await supabase
                .from('profiles')
                .select('role');

            const planCounts: Record<string, number> = {
                'Free': 0,
                'Basic': 0,
                'Premium': 0,
                'Admin': 0
            };

            planData?.forEach(profile => {
                const role = profile.role || 'free';
                if (role === 'admin') planCounts['Admin']++;
                else if (role === 'premium') planCounts['Premium']++;
                else if (role === 'basic') planCounts['Basic']++;
                else planCounts['Free']++;
            });

            const planDistribution = Object.entries(planCounts)
                .filter(([_, value]) => value > 0)
                .map(([name, value]) => ({ name, value }));

            // Recent activity (last 14 days)
            const recentActivity: Array<{ date: string; sessions: number; messages: number }> = [];
            for (let i = 13; i >= 0; i--) {
                const date = startOfDay(subDays(new Date(), i));
                const nextDay = startOfDay(subDays(new Date(), i - 1));

                const { count: sessionCount } = await supabase
                    .from('conversations')
                    .select('*', { count: 'exact', head: true })
                    .gte('created_at', date.toISOString())
                    .lt('created_at', nextDay.toISOString());

                const { count: messageCount } = await supabase
                    .from('messages')
                    .select('*', { count: 'exact', head: true })
                    .gte('created_at', date.toISOString())
                    .lt('created_at', nextDay.toISOString());

                recentActivity.push({
                    date: format(date, 'MMM dd'),
                    sessions: sessionCount || 0,
                    messages: messageCount || 0
                });
            }

            return {
                totalUsers: totalUsers || 0,
                activeUsers: activeUsers || 0,
                totalSessions: totalSessions || 0,
                activeSessions: activeSessions || 0,
                totalMessages: totalMessages || 0,
                avgSessionDuration: Math.round(avgSessionDuration),
                userGrowth: userGrowthData,
                sessionsByFacilitator,
                planDistribution,
                recentActivity
            };
        },
        refetchInterval: 60000 // Refresh every minute
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
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={analytics?.planDistribution}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {analytics?.planDistribution.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
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
                            <BarChart data={analytics?.sessionsByFacilitator} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" />
                                <YAxis dataKey="name" type="category" width={150} />
                                <Tooltip />
                                <Bar dataKey="count" fill="#10b981" name="Sessions" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
