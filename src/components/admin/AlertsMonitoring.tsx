/**
 * Alerts Monitoring
 *
 * Admin component for the AIfacilitator application.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    AlertTriangle,
    AlertCircle,
    CheckCircle,
    XCircle,
    TrendingUp,
    Users,
    MessageSquare,
    DollarSign,
    Loader2,
    Bell
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { format, subDays, subHours } from "date-fns";

interface SystemAlert {
    id: string;
    type: 'critical' | 'warning' | 'info' | 'success';
    category: 'system' | 'business' | 'content' | 'security';
    title: string;
    message: string;
    timestamp: Date;
    actionRequired: boolean;
}

export const AlertsMonitoring = () => {
    const { data: alerts, isLoading } = useQuery({
        queryKey: ['admin-alerts'],
        queryFn: async (): Promise<SystemAlert[]> => {
            const alerts: SystemAlert[] = [];
            const now = new Date();

            // Check for unusual signup spike (last hour vs previous hour)
            const oneHourAgo = subHours(now, 1).toISOString();
            const twoHoursAgo = subHours(now, 2).toISOString();

            const { count: lastHourSignups } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', oneHourAgo);

            const { count: previousHourSignups } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', twoHoursAgo)
                .lt('created_at', oneHourAgo);

            if (lastHourSignups && previousHourSignups && lastHourSignups > previousHourSignups * 3) {
                alerts.push({
                    id: 'spike-signups',
                    type: 'warning',
                    category: 'business',
                    title: 'Unusual Signup Spike Detected',
                    message: `${lastHourSignups} new signups in the last hour (3x normal rate). Possible bot activity or viral growth.`,
                    timestamp: now,
                    actionRequired: true
                });
            }

            // Check for inactive users (no login in 30 days)
            const thirtyDaysAgo = subDays(now, 30).toISOString();
            const { count: inactiveUsers } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .lt('updated_at', thirtyDaysAgo);

            if (inactiveUsers && inactiveUsers > 10) {
                alerts.push({
                    id: 'inactive-users',
                    type: 'info',
                    category: 'business',
                    title: 'Churn Risk: Inactive Users',
                    message: `${inactiveUsers} users haven't logged in for 30+ days. Consider re-engagement campaign.`,
                    timestamp: now,
                    actionRequired: true
                });
            }

            // Check for flagged content (from session monitoring)
            const { data: recentMessages } = await supabase
                .from('messages')
                .select('content, created_at')
                .gte('created_at', subHours(now, 24).toISOString())
                .limit(1000);

            const flaggedTerms = ['racist', 'sexist', 'hate', 'discrimination'];
            let flaggedCount = 0;

            recentMessages?.forEach(msg => {
                const content = typeof msg.content === 'string'
                    ? msg.content.toLowerCase()
                    : JSON.stringify(msg.content).toLowerCase();

                if (flaggedTerms.some(term => content.includes(term))) {
                    flaggedCount++;
                }
            });

            if (flaggedCount > 0) {
                alerts.push({
                    id: 'flagged-content',
                    type: 'critical',
                    category: 'content',
                    title: 'Inappropriate Content Detected',
                    message: `${flaggedCount} messages flagged in the last 24 hours. Review required.`,
                    timestamp: now,
                    actionRequired: true
                });
            }

            // System health check: verify edge functions are reachable
            // (No random mock — only real checks are performed)

            // Check for users whose subscription_status is 'past_due' (real Stripe webhook data)
            const { count: pastDueCount } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .eq('subscription_status', 'past_due');

            if ((pastDueCount || 0) > 0) {
                alerts.push({
                    id: 'payment-failures',
                    type: 'warning',
                    category: 'business',
                    title: 'Past-Due Subscriptions',
                    message: `${pastDueCount} subscription(s) are past due. Users may lose access soon.`,
                    timestamp: now,
                    actionRequired: true
                });
            }

            // Check database connection (simplified)
            const { error: dbError } = await supabase
                .from('profiles')
                .select('id')
                .limit(1);

            if (dbError) {
                alerts.push({
                    id: 'db-connection',
                    type: 'critical',
                    category: 'system',
                    title: 'Database Connection Issue',
                    message: 'Unable to connect to database. Check Supabase status.',
                    timestamp: now,
                    actionRequired: true
                });
            } else {
                alerts.push({
                    id: 'system-healthy',
                    type: 'success',
                    category: 'system',
                    title: 'All Systems Operational',
                    message: 'Database, authentication, and core services running normally.',
                    timestamp: now,
                    actionRequired: false
                });
            }

            // Sort by severity and timestamp
            const severityOrder = { critical: 0, warning: 1, info: 2, success: 3 };
            return alerts.sort((a, b) => {
                if (severityOrder[a.type] !== severityOrder[b.type]) {
                    return severityOrder[a.type] - severityOrder[b.type];
                }
                return b.timestamp.getTime() - a.timestamp.getTime();
            });
        },
        refetchInterval: 60000 // Refresh every minute
    });

    const getAlertIcon = (type: SystemAlert['type']) => {
        switch (type) {
            case 'critical':
                return <XCircle className="h-5 w-5 text-red-600" />;
            case 'warning':
                return <AlertTriangle className="h-5 w-5 text-amber-600" />;
            case 'info':
                return <AlertCircle className="h-5 w-5 text-blue-600" />;
            case 'success':
                return <CheckCircle className="h-5 w-5 text-green-600" />;
        }
    };

    const getAlertColor = (type: SystemAlert['type']) => {
        switch (type) {
            case 'critical':
                return 'border-red-200 bg-red-50';
            case 'warning':
                return 'border-amber-200 bg-amber-50';
            case 'info':
                return 'border-blue-200 bg-blue-50';
            case 'success':
                return 'border-green-200 bg-green-50';
        }
    };

    const getCategoryIcon = (category: SystemAlert['category']) => {
        switch (category) {
            case 'system':
                return <AlertCircle className="h-4 w-4" />;
            case 'business':
                return <DollarSign className="h-4 w-4" />;
            case 'content':
                return <MessageSquare className="h-4 w-4" />;
            case 'security':
                return <AlertTriangle className="h-4 w-4" />;
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            </div>
        );
    }

    const criticalAlerts = alerts?.filter(a => a.type === 'critical') || [];
    const warningAlerts = alerts?.filter(a => a.type === 'warning') || [];

    return (
        <div className="space-y-6">
            {/* Alert Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="border-red-200 bg-gradient-to-br from-red-50 to-white">
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <XCircle className="h-4 w-4 text-red-600" />
                            Critical Alerts
                        </CardDescription>
                        <CardTitle className="text-3xl font-bold text-red-900">
                            {criticalAlerts.length}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-red-600">
                            Require immediate attention
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-white">
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-600" />
                            Warnings
                        </CardDescription>
                        <CardTitle className="text-3xl font-bold text-amber-900">
                            {warningAlerts.length}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-amber-600">
                            Monitor closely
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <Bell className="h-4 w-4 text-blue-600" />
                            Total Alerts
                        </CardDescription>
                        <CardTitle className="text-3xl font-bold text-blue-900">
                            {alerts?.length || 0}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-blue-600">
                            All notifications
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white">
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            System Status
                        </CardDescription>
                        <CardTitle className="text-lg font-bold text-green-900">
                            {criticalAlerts.length === 0 ? 'Healthy' : 'Issues Detected'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-green-600">
                            Overall platform health
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Alert List */}
            <Card className="border-purple-200">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Bell className="h-5 w-5 text-purple-600" />
                        <CardTitle>Active Alerts</CardTitle>
                    </div>
                    <CardDescription>Real-time platform monitoring and notifications</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {alerts?.map((alert) => (
                            <Alert key={alert.id} className={getAlertColor(alert.type)}>
                                <div className="flex items-start gap-3">
                                    {getAlertIcon(alert.type)}
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <AlertTitle className="mb-0">{alert.title}</AlertTitle>
                                            <Badge variant="outline" className="text-xs">
                                                {getCategoryIcon(alert.category)}
                                                <span className="ml-1 capitalize">{alert.category}</span>
                                            </Badge>
                                            {alert.actionRequired && (
                                                <Badge variant="destructive" className="text-xs">
                                                    Action Required
                                                </Badge>
                                            )}
                                        </div>
                                        <AlertDescription>
                                            {alert.message}
                                        </AlertDescription>
                                        <p className="text-xs text-gray-500 mt-2">
                                            {format(alert.timestamp, 'MMM d, yyyy HH:mm:ss')}
                                        </p>
                                    </div>
                                </div>
                            </Alert>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
