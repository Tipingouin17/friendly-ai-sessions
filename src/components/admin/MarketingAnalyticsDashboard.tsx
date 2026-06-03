/**
 * MarketingAnalyticsDashboard — Admin Panel
 *
 * Reconciles paid-media platforms, GA4 website behavior, and backend-confirmed
 * business outcomes. The dashboard deliberately labels unavailable API connectors
 * as not configured instead of fabricating marketing data.
 */
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
    Activity,
    AlertTriangle,
    BarChart3,
    CheckCircle,
    Clock,
    DollarSign,
    ExternalLink,
    Gauge,
    Info,
    MousePointerClick,
    RefreshCw,
    ShieldCheck,
    TrendingUp,
    Users,
} from "lucide-react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

interface MarketingSummary {
    start_date: string;
    end_date: string;
    granularity: string;
    spend_eur: number;
    clicks: number;
    ga4_paid_sessions: number;
    ad_platform_conversions: number;
    backend_signups: number;
    backend_purchases: number;
    cac_eur: number | null;
    roas: number | null;
    data_freshness: string | null;
}

interface MarketingChannel {
    channel: string;
    label: string;
    spend_eur: number;
    clicks: number;
    platform_conversions: number;
    ga4_sessions: number;
    backend_signups: number;
    backend_purchases: number;
    cac_eur: number | null;
    variance_pct: number | null;
    status: "ok" | "watch" | "action_needed" | "not_configured" | string;
    configured: boolean;
}

interface FunnelRow {
    step: string;
    google_ads: number;
    microsoft_ads: number;
    ga4: number;
    backend: number;
}

interface TimeSeriesRow {
    date: string;
    spend_eur: number;
    clicks: number;
    ga4_sessions: number;
    platform_conversions: number;
    signups: number;
    purchases: number;
}

interface Diagnostic {
    severity: "info" | "warning" | "critical" | string;
    title: string;
    explanation: string;
}

interface MeasurementHealth {
    google_ads_api: string;
    microsoft_ads_api: string;
    ga4_data_api: string;
    marketing_snapshots_table: string;
    marketing_user_attribution_table: string;
    attribution_records: number;
    utm_coverage_pct: number | null;
    advertising_consent_rate_pct: number | null;
    analytics_consent_rate_pct: number | null;
}

interface MarketingAnalyticsData {
    summary: MarketingSummary;
    channels: MarketingChannel[];
    funnel: FunnelRow[];
    timeseries: TimeSeriesRow[];
    diagnostics: Diagnostic[];
    measurement_health: MeasurementHealth;
}

interface MarketingSyncResult {
    source: string;
    status: string;
    rows_imported: number;
    error?: string;
}

interface MarketingSyncResponse {
    status: string;
    start_date: string;
    end_date: string;
    results: MarketingSyncResult[];
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
    eur: (value: number | null | undefined) => value == null ? "—" : `€${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    num: (value: number | null | undefined) => Number(value || 0).toLocaleString(),
    pct: (value: number | null | undefined) => value == null ? "—" : `${Number(value).toFixed(1)}%`,
    ratio: (value: number | null | undefined) => value == null ? "—" : `${Number(value).toFixed(2)}x`,
};

const STATUS_STYLES: Record<string, string> = {
    ok: "bg-emerald-50 text-emerald-700 border-emerald-100",
    watch: "bg-amber-50 text-amber-700 border-amber-100",
    action_needed: "bg-red-50 text-red-700 border-red-100",
    not_configured: "bg-slate-50 text-slate-600 border-slate-200",
    missing: "bg-amber-50 text-amber-700 border-amber-100",
    configured: "bg-emerald-50 text-emerald-700 border-emerald-100",
};

const FUNNEL_COLORS = ["#6366f1", "#8b5cf6", "#06b6d4", "#10b981"];

const KpiCard = ({
    title,
    value,
    sub,
    icon: Icon,
    color,
}: {
    title: string;
    value: string;
    sub?: string;
    icon: React.ElementType;
    color: string;
}) => (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-start gap-4">
        <div className={`p-3 rounded-xl ${color}`}>
            <Icon className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide truncate">{title}</p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
            {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
    </div>
);

const StatusBadge = ({ status }: { status: string }) => (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[status] || STATUS_STYLES.not_configured}`}>
        {status.replace(/_/g, " ")}
    </span>
);

const EmptyConnectorState = () => (
    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-5 flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
        <div>
            <div className="flex items-center gap-2 text-indigo-800 font-semibold">
                <ShieldCheck className="h-4 w-4" />
                Business truth is already available; ad-platform connectors are pending.
            </div>
            <p className="text-sm text-indigo-700/80 mt-1 max-w-3xl">
                This dashboard is intentionally showing backend-confirmed signups and purchases now, while Google Ads, Microsoft Advertising, and GA4 remain marked as not configured until API sync tables or credentials are connected.
            </p>
        </div>
        <a
            href="https://developers.google.com/analytics/devguides/reporting/data/v1"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-700 hover:text-indigo-900"
        >
            GA4 Data API reference <ExternalLink className="h-3.5 w-3.5" />
        </a>
    </div>
);

export const MarketingAnalyticsDashboard = () => {
    const [syncResult, setSyncResult] = useState<MarketingSyncResponse | null>(null);
    const apiUrl = (import.meta.env as Record<string, string>).VITE_API_URL ||
        "https://friendly-ai-sessions-production.up.railway.app";

    const { data, isLoading, error, refetch, isFetching } = useQuery<MarketingAnalyticsData>({
        queryKey: ["admin-marketing-analytics"],
        queryFn: async () => {
            const token = getAdminAccessToken();
            const res = await fetch(`${apiUrl}/admin/marketing-analytics`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
        },
        staleTime: 60_000,
    });

    const syncMutation = useMutation<MarketingSyncResponse>({
        mutationFn: async () => {
            const token = getAdminAccessToken();
            const res = await fetch(`${apiUrl}/admin/marketing-analytics/sync`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ sources: ["google_ads", "microsoft_ads", "ga4"], days: 30 }),
            });
            const body = await res.json().catch(() => null);
            if (!res.ok) throw new Error(body?.detail || `HTTP ${res.status}`);
            return body;
        },
        onSuccess: (result) => {
            setSyncResult(result);
            refetch();
        },
    });

    if (isLoading) return (
        <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
        </div>
    );

    if (error || !data) return (
        <div className="flex items-center justify-center h-64 text-red-500 gap-2">
            <AlertTriangle className="h-5 w-5" />
            <span>Failed to load marketing analytics</span>
        </div>
    );

    const { summary, channels, funnel, timeseries, diagnostics, measurement_health } = data;
    const connectorConfigured = channels.some((c) => c.configured);
    const dataQualityStatus = connectorConfigured && diagnostics.every((d) => d.severity !== "warning" && d.severity !== "critical") ? "ok" : connectorConfigured ? "watch" : "not_configured";

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Marketing Analytics</h2>
                    <p className="text-sm text-gray-500 mt-1 max-w-3xl">
                        Reconcile paid-media platforms, GA4 website behavior, and backend-confirmed business outcomes without forcing incompatible numbers to match.
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                    <button
                        onClick={() => syncMutation.mutate()}
                        disabled={syncMutation.isPending}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
                    >
                        <RefreshCw className={`h-4 w-4 ${syncMutation.isPending ? "animate-spin" : ""}`} />
                        Sync live APIs
                    </button>
                    <button
                        onClick={() => refetch()}
                        disabled={isFetching}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-60"
                    >
                        <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
                        Refresh
                    </button>
                </div>
            </div>

            {!connectorConfigured && <EmptyConnectorState />}


            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <KpiCard title="Paid Spend" value={fmt.eur(summary.spend_eur)} sub="Google Ads + Microsoft Ads" icon={DollarSign} color="bg-emerald-500" />
                <KpiCard title="Paid Clicks" value={fmt.num(summary.clicks)} sub={`${fmt.num(summary.ga4_paid_sessions)} GA4 paid sessions`} icon={MousePointerClick} color="bg-indigo-500" />
                <KpiCard title="Backend Purchases" value={fmt.num(summary.backend_purchases)} sub={`${fmt.num(summary.backend_signups)} backend signups`} icon={Users} color="bg-violet-500" />
                <KpiCard title="Blended Paid CAC" value={fmt.eur(summary.cac_eur)} sub={summary.data_freshness ? `Synced ${new Date(summary.data_freshness).toLocaleString()}` : "Awaiting ad API syncs"} icon={TrendingUp} color="bg-amber-500" />
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-100 flex items-center justify-between gap-3">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Channel reconciliation</h3>
                        <p className="text-sm text-gray-500">Ad platforms optimize campaigns; GA4 validates behavior; backend data is business truth.</p>
                    </div>
                    <StatusBadge status={dataQualityStatus} />
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100 text-sm">
                        <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                            <tr>
                                <th className="px-5 py-3 text-left font-semibold">Channel</th>
                                <th className="px-5 py-3 text-right font-semibold">Spend</th>
                                <th className="px-5 py-3 text-right font-semibold">Clicks</th>
                                <th className="px-5 py-3 text-right font-semibold">GA4 sessions</th>
                                <th className="px-5 py-3 text-right font-semibold">Platform conv.</th>
                                <th className="px-5 py-3 text-right font-semibold">Backend signups</th>
                                <th className="px-5 py-3 text-right font-semibold">Backend purchases</th>
                                <th className="px-5 py-3 text-right font-semibold">CAC</th>
                                <th className="px-5 py-3 text-left font-semibold">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {channels.map((channel) => (
                                <tr key={channel.channel} className="hover:bg-gray-50/70">
                                    <td className="px-5 py-3 font-semibold text-gray-900">{channel.label}</td>
                                    <td className="px-5 py-3 text-right text-gray-700">{fmt.eur(channel.spend_eur)}</td>
                                    <td className="px-5 py-3 text-right text-gray-700">{fmt.num(channel.clicks)}</td>
                                    <td className="px-5 py-3 text-right text-gray-700">{fmt.num(channel.ga4_sessions)}</td>
                                    <td className="px-5 py-3 text-right text-gray-700">{fmt.num(channel.platform_conversions)}</td>
                                    <td className="px-5 py-3 text-right text-gray-700">{fmt.num(channel.backend_signups)}</td>
                                    <td className="px-5 py-3 text-right text-gray-700">{fmt.num(channel.backend_purchases)}</td>
                                    <td className="px-5 py-3 text-right text-gray-700">{fmt.eur(channel.cac_eur)}</td>
                                    <td className="px-5 py-3"><StatusBadge status={channel.status} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Funnel truth ladder</h3>
                            <p className="text-sm text-gray-500">Clicks are not sessions; sessions are not signups; signups are not purchases.</p>
                        </div>
                        <BarChart3 className="h-5 w-5 text-indigo-500" />
                    </div>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={funnel} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="step" tick={{ fontSize: 11 }} />
                                <YAxis allowDecimals={false} />
                                <Tooltip />
                                <Bar dataKey="google_ads" name="Google Ads" fill={FUNNEL_COLORS[0]} radius={[6, 6, 0, 0]} />
                                <Bar dataKey="microsoft_ads" name="Microsoft Ads" fill={FUNNEL_COLORS[1]} radius={[6, 6, 0, 0]} />
                                <Bar dataKey="ga4" name="GA4" fill={FUNNEL_COLORS[2]} radius={[6, 6, 0, 0]} />
                                <Bar dataKey="backend" name="Backend" fill={FUNNEL_COLORS[3]} radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Trend overview</h3>
                            <p className="text-sm text-gray-500">Backend outcomes remain visible even before ad API syncs are connected.</p>
                        </div>
                        <Activity className="h-5 w-5 text-violet-500" />
                    </div>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={timeseries} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                                <YAxis allowDecimals={false} />
                                <Tooltip />
                                <Line type="monotone" dataKey="clicks" name="Clicks" stroke="#6366f1" strokeWidth={2} dot={false} />
                                <Line type="monotone" dataKey="ga4_sessions" name="GA4 sessions" stroke="#06b6d4" strokeWidth={2} dot={false} />
                                <Line type="monotone" dataKey="signups" name="Backend signups" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
                                <Line type="monotone" dataKey="purchases" name="Backend purchases" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <details className="rounded-2xl border border-gray-100 bg-white shadow-sm">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                    <span className="flex items-center gap-2">
                        <Gauge className="h-4 w-4 text-gray-500" />
                        Configuration & diagnostics
                    </span>
                    <span className="text-xs font-medium text-gray-400">Collapsed by default</span>
                </summary>
                <div className="space-y-5 border-t border-gray-100 p-5">
                    {(syncResult || syncMutation.error) && (
                        <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-5">
                            <div className="flex items-center gap-2 mb-3">
                                <Clock className="h-5 w-5 text-indigo-500" />
                                <h3 className="text-lg font-bold text-gray-900">Live API sync result</h3>
                            </div>
                            {syncMutation.error ? (
                                <p className="text-sm text-red-600">{syncMutation.error instanceof Error ? syncMutation.error.message : "Live sync failed"}</p>
                            ) : syncResult && (
                                <div className="space-y-2">
                                    <p className="text-sm text-gray-600">Imported range: {syncResult.start_date} to {syncResult.end_date}. Overall status: <span className="font-semibold">{syncResult.status}</span>.</p>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        {syncResult.results.map((result) => (
                                            <div key={result.source} className="rounded-xl border border-gray-100 bg-white p-3">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-sm font-semibold text-gray-900">{result.source.replace(/_/g, " ")}</span>
                                                    <StatusBadge status={result.status} />
                                                </div>
                                                <p className="text-xs text-gray-500 mt-1">Rows imported: {fmt.num(result.rows_imported)}</p>
                                                {result.error && <p className="text-xs text-red-600 mt-1 line-clamp-2">{result.error}</p>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                        <div className="xl:col-span-2 rounded-2xl border border-gray-100 bg-gray-50/70 p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <Info className="h-5 w-5 text-indigo-500" />
                                <h3 className="text-lg font-bold text-gray-900">Discrepancy explainer</h3>
                            </div>
                            <div className="space-y-3">
                                {diagnostics.map((diagnostic, index) => (
                                    <div key={`${diagnostic.title}-${index}`} className="rounded-xl border border-gray-100 bg-white p-4">
                                        <div className="flex items-start gap-3">
                                            {diagnostic.severity === "warning" || diagnostic.severity === "critical" ? (
                                                <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                                            ) : (
                                                <CheckCircle className="h-5 w-5 text-indigo-500 mt-0.5" />
                                            )}
                                            <div>
                                                <p className="font-semibold text-gray-900">{diagnostic.title}</p>
                                                <p className="text-sm text-gray-600 mt-1">{diagnostic.explanation}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <Gauge className="h-5 w-5 text-emerald-500" />
                                <h3 className="text-lg font-bold text-gray-900">Measurement health</h3>
                            </div>
                            <div className="space-y-3">
                                {[
                                    ["Google Ads API", measurement_health.google_ads_api],
                                    ["Microsoft Ads API", measurement_health.microsoft_ads_api],
                                    ["GA4 Data API", measurement_health.ga4_data_api],
                                    ["Snapshot cache", measurement_health.marketing_snapshots_table],
                                    ["Attribution storage", measurement_health.marketing_user_attribution_table],
                                ].map(([label, status]) => (
                                    <div key={label} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2">
                                        <span className="text-sm font-medium text-gray-700">{label}</span>
                                        <StatusBadge status={String(status)} />
                                    </div>
                                ))}
                                <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-3 text-sm text-indigo-800">
                                    <div className="flex items-center gap-2 font-semibold"><Clock className="h-4 w-4" /> Attribution records</div>
                                    <p className="mt-1">{fmt.num(measurement_health.attribution_records)} persisted records. Next step: store UTMs and click IDs at first visit and signup.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </details>
        </div>
    );
};
