import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Settings, Users, FileText, BarChart3, TrendingUp, DollarSign, Bell, MessageSquare } from "lucide-react";
import { PromptManagement } from "@/components/admin/PromptManagement";
import { PlanManagement } from "@/components/admin/PlanManagement";
import { UserManagement } from "@/components/admin/UserManagement";
import { SessionMonitoring } from "@/components/admin/SessionMonitoring";
import { SystemSettings } from "@/components/admin/SystemSettings";
import { AnalyticsDashboard } from "@/components/admin/AnalyticsDashboard";
import { RevenueDashboard } from "@/components/admin/RevenueDashboard";
import { AlertsMonitoring } from "@/components/admin/AlertsMonitoring";
import { CommunicationCenter } from "@/components/admin/CommunicationCenter";
import { motion } from "framer-motion";
import { pageVariants } from "@/lib/animations";

const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState("analytics");

    return (
        <motion.div
            className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50"
            initial="initial"
            animate="animate"
            exit="exit"
            variants={pageVariants}
        >
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl shadow-lg">
                            <Shield className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                                Platform Administration
                            </h1>
                            <p className="text-gray-600 mt-1">
                                Manage facilitators, users, sessions, and platform settings
                            </p>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList className="grid w-full grid-cols-9 lg:w-auto lg:inline-grid bg-white/80 backdrop-blur-sm p-1 rounded-xl shadow-md">
                        <TabsTrigger
                            value="analytics"
                            className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
                        >
                            <TrendingUp className="h-4 w-4" />
                            <span className="hidden sm:inline">Analytics</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="revenue"
                            className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
                        >
                            <DollarSign className="h-4 w-4" />
                            <span className="hidden sm:inline">Revenue</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="alerts"
                            className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
                        >
                            <Bell className="h-4 w-4" />
                            <span className="hidden sm:inline">Alerts</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="communication"
                            className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
                        >
                            <MessageSquare className="h-4 w-4" />
                            <span className="hidden sm:inline">Comm.</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="monitoring"
                            className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
                        >
                            <BarChart3 className="h-4 w-4" />
                            <span className="hidden sm:inline">Monitoring</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="prompts"
                            className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
                        >
                            <FileText className="h-4 w-4" />
                            <span className="hidden sm:inline">Prompts</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="users"
                            className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
                        >
                            <Users className="h-4 w-4" />
                            <span className="hidden sm:inline">Users</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="plans"
                            className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
                        >
                            <Settings className="h-4 w-4" />
                            <span className="hidden sm:inline">Plans</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="settings"
                            className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
                        >
                            <Settings className="h-4 w-4" />
                            <span className="hidden sm:inline">Settings</span>
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="analytics" className="space-y-4">
                        <AnalyticsDashboard />
                    </TabsContent>

                    <TabsContent value="revenue" className="space-y-4">
                        <RevenueDashboard />
                    </TabsContent>

                    <TabsContent value="alerts" className="space-y-4">
                        <AlertsMonitoring />
                    </TabsContent>

                    <TabsContent value="communication" className="space-y-4">
                        <CommunicationCenter />
                    </TabsContent>

                    <TabsContent value="monitoring" className="space-y-4">
                        <SessionMonitoring />
                    </TabsContent>

                    <TabsContent value="prompts" className="space-y-4">
                        <PromptManagement />
                    </TabsContent>

                    <TabsContent value="users" className="space-y-4">
                        <UserManagement />
                    </TabsContent>

                    <TabsContent value="plans" className="space-y-4">
                        <PlanManagement />
                    </TabsContent>

                    <TabsContent value="settings" className="space-y-4">
                        <SystemSettings />
                    </TabsContent>
                </Tabs>
            </div>
        </motion.div>
    );
};

export default AdminDashboard;
