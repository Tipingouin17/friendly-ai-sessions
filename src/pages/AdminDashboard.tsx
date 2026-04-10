/**
 * Admin Dashboard — Main Page
 * World-class sidebar navigation with all admin modules including the new Facilitators tab.
 */
import { useState } from "react";
import {
    Shield, Settings, Users, FileText, BarChart3, TrendingUp, DollarSign,
    Bell, MessageSquare, ArrowLeft, Bot, Activity, ChevronRight, Menu, X,
} from "lucide-react";
import { PromptManagement } from "@/components/admin/PromptManagement";
import { PlanManagement } from "@/components/admin/PlanManagement";
import { UserManagement } from "@/components/admin/UserManagement";
import { FacilitatorManagement } from "@/components/admin/FacilitatorManagement";
import { SessionMonitoring } from "@/components/admin/SessionMonitoring";
import { SystemSettings } from "@/components/admin/SystemSettings";
import { AnalyticsDashboard } from "@/components/admin/AnalyticsDashboard";
import { RevenueDashboard } from "@/components/admin/RevenueDashboard";
import { CostRevenueDashboard } from "@/components/admin/CostRevenueDashboard";
import { AlertsMonitoring } from "@/components/admin/AlertsMonitoring";
import { CommunicationCenter } from "@/components/admin/CommunicationCenter";
import { motion, AnimatePresence } from "framer-motion";
import { pageVariants } from "@/lib/animations";
import { Link } from "react-router-dom";
import PageHead from "@/components/PageHead";
import ErrorBoundary from "@/components/ErrorBoundary";
import { cn } from "@/lib/utils";

// ─── Nav Config ──────────────────────────────────────────────────────────────

const NAV_GROUPS = [
    {
        label: "Overview",
        items: [
            { id: "analytics", label: "Analytics", icon: TrendingUp, description: "Platform growth & engagement" },
            { id: "revenue", label: "Revenue", icon: DollarSign, description: "Subscriptions & billing" },
            { id: "costs", label: "Cost & Margin", icon: BarChart3, description: "LLM costs, margins & session economics" },
            { id: "alerts", label: "Alerts", icon: Bell, description: "System & business alerts" },
        ],
    },
    {
        label: "Management",
        items: [
            { id: "users", label: "Users", icon: Users, description: "User accounts & plans" },
            { id: "facilitators", label: "Facilitators", icon: Bot, description: "AI facilitator profiles" },
            { id: "plans", label: "Plans", icon: Settings, description: "Subscription plans & pricing" },
            { id: "prompts", label: "Prompts & AI", icon: FileText, description: "Session AI configuration" },
        ],
    },
    {
        label: "Operations",
        items: [
            { id: "monitoring", label: "Sessions", icon: Activity, description: "Live session monitoring" },
            { id: "communication", label: "Communication", icon: MessageSquare, description: "Messages & FAQ" },
        ],
    },
    {
        label: "Configuration",
        items: [
            { id: "settings", label: "Settings", icon: Settings, description: "Platform configuration" },
        ],
    },
];

const CONTENT_MAP: Record<string, React.ReactNode> = {
    analytics: <AnalyticsDashboard />,
    revenue: <RevenueDashboard />,
    costs: <CostRevenueDashboard />,
    alerts: <AlertsMonitoring />,
    users: <UserManagement />,
    facilitators: <FacilitatorManagement />,
    plans: <PlanManagement />,
    prompts: <PromptManagement />,
    monitoring: <SessionMonitoring />,
    communication: <CommunicationCenter />,
    settings: <SystemSettings />,
};

const LABEL_MAP: Record<string, string> = {
    analytics: "Analytics",
    revenue: "Revenue",
    costs: "Cost & Margin",
    alerts: "Alerts",
    users: "Users",
    facilitators: "Facilitators",
    plans: "Plans",
    prompts: "Prompts & AI",
    monitoring: "Sessions",
    communication: "Communication",
    settings: "Settings",
};

// ─── Component ────────────────────────────────────────────────────────────────

const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState("analytics");
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const activeItem = NAV_GROUPS.flatMap(g => g.items).find(i => i.id === activeTab);

    return (
        <ErrorBoundary>
            <motion.div
                className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50"
                initial="initial"
                animate="animate"
                exit="exit"
                variants={pageVariants}
            >
                <PageHead title="Admin Dashboard" description="Platform administration and management" />

                <div className="flex h-screen overflow-hidden">
                    {/* ── Sidebar ─────────────────────────────────────────────────── */}
                    {/* Mobile overlay */}
                    <AnimatePresence>
                        {sidebarOpen && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 bg-black/40 z-30 lg:hidden"
                                onClick={() => setSidebarOpen(false)}
                            />
                        )}
                    </AnimatePresence>

                    <aside
                        className={cn(
                            "fixed lg:sticky top-0 left-0 h-screen w-64 bg-white border-r border-gray-200 shadow-xl z-40 flex flex-col transition-transform duration-300 lg:translate-x-0",
                            sidebarOpen ? "translate-x-0" : "-translate-x-full"
                        )}
                    >
                        {/* Sidebar header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-purple-600 to-indigo-600">
                            <div className="flex items-center gap-2.5">
                                <div className="p-1.5 bg-white/20 rounded-lg">
                                    <Shield className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <p className="text-white font-bold text-sm leading-tight">Admin Panel</p>
                                    <p className="text-purple-200 text-xs">Platform Management</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSidebarOpen(false)}
                                className="lg:hidden text-white/70 hover:text-white"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Back link */}
                        <div className="px-4 pt-3 pb-1">
                            <Link
                                to="/"
                                className="flex items-center gap-2 text-xs text-gray-500 hover:text-purple-600 transition-colors px-2 py-1.5 rounded-lg hover:bg-purple-50"
                            >
                                <ArrowLeft className="h-3.5 w-3.5" />
                                Back to App
                            </Link>
                        </div>

                        {/* Navigation */}
                        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
                            {NAV_GROUPS.map(group => (
                                <div key={group.label}>
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-1.5">
                                        {group.label}
                                    </p>
                                    <div className="space-y-0.5">
                                        {group.items.map(item => {
                                            const Icon = item.icon;
                                            const isActive = activeTab === item.id;
                                            return (
                                                <button
                                                    key={item.id}
                                                    onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                                                    className={cn(
                                                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group",
                                                        isActive
                                                            ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-200"
                                                            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                                                    )}
                                                >
                                                    <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-white" : "text-gray-400 group-hover:text-gray-600")} />
                                                    <span className="flex-1 text-left">{item.label}</span>
                                                    {isActive && <ChevronRight className="h-3.5 w-3.5 text-white/70" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </nav>

                        {/* Sidebar footer */}
                        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
                            <p className="text-xs text-gray-400 text-center">AI Facilitator Platform</p>
                        </div>
                    </aside>

                    {/* ── Main Content ─────────────────────────────────────────────── */}
                    <main className="flex-1 overflow-y-auto">
                        {/* Top bar */}
                        <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-sm border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center gap-4">
                            <button
                                onClick={() => setSidebarOpen(true)}
                                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                            >
                                <Menu className="h-5 w-5" />
                            </button>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                <Shield className="h-4 w-4 text-purple-600" />
                                <span className="text-gray-400">/</span>
                                <span className="font-semibold text-gray-800">{LABEL_MAP[activeTab]}</span>
                            </div>
                            {activeItem && (
                                <p className="hidden sm:block text-xs text-gray-400 ml-1">— {activeItem.description}</p>
                            )}
                        </div>

                        {/* Tab content */}
                        <div className="p-4 sm:p-6 max-w-7xl mx-auto">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeTab}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    transition={{ duration: 0.18 }}
                                >
                                    {CONTENT_MAP[activeTab]}
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </main>
                </div>
            </motion.div>
        </ErrorBoundary>
    );
};

export default AdminDashboard;
