/**
 * CostRevenueDashboard — Admin Panel
 * Displays LLM token costs per session, total costs, revenue, and gross margin.
 */
import { useQuery } from "@tanstack/react-query";
import {
    DollarSign, TrendingUp, TrendingDown, Zap, BarChart3,
    Activity, CheckCircle, Clock, AlertTriangle,
} from "lucide-react";
import {
    BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";

// ─── Types ───────────────────────────────────────────────────────────────────

interface CostSummary {
    total_cost_usd: number;
    total_cost_eur: number;
    total_sessions: number;
    completed_sessions: number;
    monthly_revenue_eur: number;
    gross_margin_pct: number | null;
}

interface MonthlyCost {
    month: string;
    cost_usd: number;
    sessions: number;
}

interface PerSession {
    id: number;
    session_title: string | null;
    total_cost_usd: number;
    total_messages: number | null;
    session_duration_minutes: number | null;
    current_participants: number | null;
    is_session_ended: boolean;
    created_at: string;
    ended_at: string | null;
}

interface RevenuePlan {
    plan_name: string;
    plan_price_eur: number;
    subscriber_count: number;
    monthly_revenue_eur: number;
}

interface TokenByModel {
    model: string;
    total_prompt_tokens: number;
    total_completion_tokens: number;
    message_count: number;
}

interface CostAnalyticsData {
    summary: CostSummary;
    monthly_costs: MonthlyCost[];
    per_session: PerSession[];
    revenue_by_plan: RevenuePlan[];
    token_by_model: TokenByModel[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PLAN_COLORS = ["#94a3b8", "#6366f1", "#8b5cf6", "#a855f7"];

const fmt = {
    usd: (v: number) => `$${v.toFixed(v < 0.01 ? 6 : 4)}`,
    eur: (v: number) => `€${v.toFixed(2)}`,
    pct: (v: number | null) => v != null ? `${v.toFixed(1)}%` : "—",
    num: (v: number | null | undefined) => (v ?? 0).toLocaleString(),
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────

const KpiCard = ({
    title, value, sub, icon: Icon, color, trend,
}: {
    title: string;
    value: string;
    sub?: string;
    icon: React.ElementType;
    color: string;
    trend?: "up" | "down" | "neutral";
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
        {trend && (
            <div className={`text-xs font-semibold px-2 py-1 rounded-full ${
                trend === "up" ? "bg-green-50 text-green-600" :
                trend === "down" ? "bg-red-50 text-red-600" :
                "bg-gray-50 text-gray-500"
            }`}>
                {trend === "up" ? <TrendingUp className="h-3.5 w-3.5" /> :
                 trend === "down" ? <TrendingDown className="h-3.5 w-3.5" /> : null}
            </div>
        )}
    </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export const CostRevenueDashboard = () => {
    const { data, isLoading, error } = useQuery<CostAnalyticsData>({
        queryKey: ["admin-cost-analytics"],
        queryFn: async () => {
            // Use the same session key as api.ts ("mf_session")
            const raw = localStorage.getItem("mf_session");
            const token = raw ? (JSON.parse(raw) as { access_token?: string }).access_token ?? "" : "";
            const apiUrl = (import.meta.env as Record<string, string>).VITE_API_URL ||
                "https://friendly-ai-sessions-production.up.railway.app";
            const res = await fetch(`${apiUrl}/admin/cost-analytics`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
        },
        staleTime: 60_000,
    });

    if (isLoading) return (
        <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
        </div>
    );

    if (error || !data) return (
        <div className="flex items-center justify-center h-64 text-red-500 gap-2">
            <AlertTriangle className="h-5 w-5" />
            <span>Failed to load cost analytics</span>
        </div>
    );

    const { summary, monthly_costs, per_session, revenue_by_plan, token_by_model } = data;

    // Build monthly revenue vs cost chart data
    const monthlyChartData = monthly_costs.map(m => ({
        month: m.month,
        cost_usd: Number(m.cost_usd),
        sessions: Number(m.sessions),
    }));

    // Total tokens
    const totalPromptTokens = token_by_model.reduce((s, r) => s + Number(r.total_prompt_tokens || 0), 0);
    const totalCompletionTokens = token_by_model.reduce((s, r) => s + Number(r.total_completion_tokens || 0), 0);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Cost & Revenue</h2>
                <p className="text-sm text-gray-500 mt-1">LLM token costs, session economics, and subscription revenue</p>
            </div>

            {/* KPI Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <KpiCard
                    title="Monthly Revenue"
                    value={fmt.eur(summary.monthly_revenue_eur)}
                    sub="Active subscriptions"
                    icon={DollarSign}
                    color="bg-emerald-500"
                    trend="up"
                />
                <KpiCard
                    title="Total LLM Cost"
                    value={fmt.usd(summary.total_cost_usd)}
                    sub={`≈ ${fmt.eur(summary.total_cost_eur)} EUR`}
                    icon={Zap}
                    color="bg-amber-500"
                />
                <KpiCard
                    title="Gross Margin"
                    value={fmt.pct(summary.gross_margin_pct)}
                    sub="Revenue minus LLM costs"
                    icon={TrendingUp}
                    color={summary.gross_margin_pct != null && summary.gross_margin_pct > 90 ? "bg-green-500" : "bg-orange-500"}
                    trend={summary.gross_margin_pct != null && summary.gross_margin_pct > 80 ? "up" : "down"}
                />
                <KpiCard
                    title="Sessions"
                    value={fmt.num(summary.total_sessions)}
                    sub={`${fmt.num(summary.completed_sessions)} completed`}
                    icon={Activity}
                    color="bg-indigo-500"
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Monthly LLM Cost */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">Monthly LLM Cost (USD)</h3>
                    {monthlyChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={monthlyChartData} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${v}`} />
                                <Tooltip formatter={(v: number) => [`$${v.toFixed(6)}`, "Cost"]} />
                                <Bar dataKey="cost_usd" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
                            No cost data yet — costs will appear once sessions use AI responses
                        </div>
                    )}
                </div>

                {/* Revenue by Plan */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">Revenue by Plan (EUR/month)</h3>
                    {revenue_by_plan.some(r => r.subscriber_count > 0) ? (
                        <ResponsiveContainer width="100%" height={220}>
                            <PieChart>
                                <Pie
                                    data={revenue_by_plan.filter(r => r.subscriber_count > 0)}
                                    dataKey="monthly_revenue_eur"
                                    nameKey="plan_name"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={80}
                                    label={({ plan_name, monthly_revenue_eur }) =>
                                        `${plan_name}: €${Number(monthly_revenue_eur).toFixed(0)}`
                                    }
                                >
                                    {revenue_by_plan.map((_, i) => (
                                        <Cell key={i} fill={PLAN_COLORS[i % PLAN_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(v: number) => [`€${v.toFixed(2)}`, "Revenue"]} />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
                            No paid subscribers yet
                        </div>
                    )}
                </div>
            </div>

            {/* Token Usage by Model */}
            {token_by_model.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">Token Usage by Model</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
                                    <th className="pb-2 pr-4">Model</th>
                                    <th className="pb-2 pr-4 text-right">Prompt Tokens</th>
                                    <th className="pb-2 pr-4 text-right">Completion Tokens</th>
                                    <th className="pb-2 pr-4 text-right">Messages</th>
                                    <th className="pb-2 text-right">Est. Cost</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {token_by_model.map((row, i) => {
                                    const pt = Number(row.total_prompt_tokens || 0);
                                    const ct = Number(row.total_completion_tokens || 0);
                                    // Rough cost estimate using gpt-4.1-mini pricing
                                    const cost = (pt / 1e6) * 0.40 + (ct / 1e6) * 1.60;
                                    return (
                                        <tr key={i} className="hover:bg-gray-50">
                                            <td className="py-2.5 pr-4 font-mono text-xs text-purple-700">{row.model}</td>
                                            <td className="py-2.5 pr-4 text-right text-gray-600">{pt.toLocaleString()}</td>
                                            <td className="py-2.5 pr-4 text-right text-gray-600">{ct.toLocaleString()}</td>
                                            <td className="py-2.5 pr-4 text-right text-gray-600">{Number(row.message_count).toLocaleString()}</td>
                                            <td className="py-2.5 text-right font-medium text-amber-600">{fmt.usd(cost)}</td>
                                        </tr>
                                    );
                                })}
                                <tr className="border-t border-gray-200 font-semibold">
                                    <td className="py-2.5 pr-4 text-gray-700">Total</td>
                                    <td className="py-2.5 pr-4 text-right text-gray-700">{totalPromptTokens.toLocaleString()}</td>
                                    <td className="py-2.5 pr-4 text-right text-gray-700">{totalCompletionTokens.toLocaleString()}</td>
                                    <td className="py-2.5 pr-4 text-right text-gray-700">
                                        {token_by_model.reduce((s, r) => s + Number(r.message_count || 0), 0).toLocaleString()}
                                    </td>
                                    <td className="py-2.5 text-right text-amber-700">{fmt.usd(summary.total_cost_usd)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Per-Session Cost Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Per-Session Cost Breakdown</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
                                <th className="pb-2 pr-4">Session</th>
                                <th className="pb-2 pr-4 text-right">LLM Cost</th>
                                <th className="pb-2 pr-4 text-right">Messages</th>
                                <th className="pb-2 pr-4 text-right">Duration</th>
                                <th className="pb-2 pr-4 text-right">Participants</th>
                                <th className="pb-2 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {per_session.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-8 text-center text-gray-400 text-sm">
                                        No sessions yet
                                    </td>
                                </tr>
                            ) : per_session.map((s) => (
                                <tr key={s.id} className="hover:bg-gray-50">
                                    <td className="py-2.5 pr-4 font-medium text-gray-800 max-w-[200px] truncate">
                                        {s.session_title || `Session #${s.id}`}
                                    </td>
                                    <td className="py-2.5 pr-4 text-right font-mono text-amber-600">
                                        {s.total_cost_usd > 0 ? fmt.usd(s.total_cost_usd) : <span className="text-gray-300">$0.000000</span>}
                                    </td>
                                    <td className="py-2.5 pr-4 text-right text-gray-600">{fmt.num(s.total_messages)}</td>
                                    <td className="py-2.5 pr-4 text-right text-gray-600">
                                        {s.session_duration_minutes != null ? `${s.session_duration_minutes}m` : "—"}
                                    </td>
                                    <td className="py-2.5 pr-4 text-right text-gray-600">{fmt.num(s.current_participants)}</td>
                                    <td className="py-2.5 text-center">
                                        {s.is_session_ended ? (
                                            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                                                <CheckCircle className="h-3 w-3" /> Done
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                                <Clock className="h-3 w-3" /> Active
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Revenue vs Cost Summary */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 text-white">
                <h3 className="text-sm font-semibold text-purple-200 uppercase tracking-wide mb-4">Business Health Summary</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                        <p className="text-purple-200 text-xs">Monthly Revenue</p>
                        <p className="text-2xl font-bold mt-1">{fmt.eur(summary.monthly_revenue_eur)}</p>
                    </div>
                    <div>
                        <p className="text-purple-200 text-xs">LLM Cost (all time)</p>
                        <p className="text-2xl font-bold mt-1">{fmt.usd(summary.total_cost_usd)}</p>
                    </div>
                    <div>
                        <p className="text-purple-200 text-xs">Gross Margin</p>
                        <p className="text-2xl font-bold mt-1">{fmt.pct(summary.gross_margin_pct)}</p>
                    </div>
                    <div>
                        <p className="text-purple-200 text-xs">Cost per Session</p>
                        <p className="text-2xl font-bold mt-1">
                            {summary.total_sessions > 0
                                ? fmt.usd(summary.total_cost_usd / summary.total_sessions)
                                : "$0.000000"}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
