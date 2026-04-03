/**
 * Session Insights
 *
 * Analytics component for the AIfacilitator application.
 */
import { motion } from "framer-motion";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Users, TrendingUp, MessageSquare, Clock } from "lucide-react";
import { staggerContainer, staggerItem, fadeIn } from "@/lib/animations";

interface SessionInsightsProps {
    sessionId?: string;
}

// Mock data - replace with real API data later
const engagementData = [
    { time: "0m", score: 65 },
    { time: "5m", score: 75 },
    { time: "10m", score: 85 },
    { time: "15m", score: 80 },
    { time: "20m", score: 90 },
    { time: "25m", score: 95 },
    { time: "30m", score: 85 },
];

const participationData = [
    { name: "Active", value: 75, color: "#8b5cf6" },
    { name: "Passive", value: 20, color: "#c4b5fd" },
    { name: "Inactive", value: 5, color: "#e5e7eb" },
];

const topicDistribution = [
    { topic: "Strategy", count: 12 },
    { topic: "Budget", count: 8 },
    { topic: "Timeline", count: 15 },
    { topic: "Risks", count: 5 },
];

export const SessionInsights = ({ sessionId }: SessionInsightsProps) => {
    return (
        <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="space-y-6"
        >
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: "Engagement Score", value: "85%", icon: TrendingUp, color: "text-green-600", bg: "bg-green-100" },
                    { label: "Active Participants", value: "12/15", icon: Users, color: "text-blue-600", bg: "bg-blue-100" },
                    { label: "Key Insights", value: "5", icon: Brain, color: "text-purple-600", bg: "bg-purple-100" },
                    { label: "Avg Response Time", value: "1.2m", icon: Clock, color: "text-orange-600", bg: "bg-orange-100" },
                ].map((stat, index) => (
                    <motion.div key={index} variants={staggerItem}>
                        <Card>
                            <CardContent className="flex items-center p-6">
                                <div className={`p-3 rounded-full ${stat.bg} mr-4`}>
                                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                                    <h3 className="text-2xl font-bold">{stat.value}</h3>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Engagement Timeline */}
                <motion.div variants={staggerItem} className="col-span-1 lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Engagement Timeline</CardTitle>
                            <CardDescription>Participant engagement levels throughout the session</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={engagementData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="time" axisLine={false} tickLine={false} />
                                    <YAxis axisLine={false} tickLine={false} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="score"
                                        stroke="#8b5cf6"
                                        strokeWidth={3}
                                        dot={{ r: 4, fill: "#8b5cf6" }}
                                        activeDot={{ r: 6 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Participation Breakdown */}
                <motion.div variants={staggerItem}>
                    <Card className="h-full">
                        <CardHeader>
                            <CardTitle>Participation Breakdown</CardTitle>
                            <CardDescription>Activity levels of attendees</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[300px] flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={participationData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {participationData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute space-y-2">
                                {participationData.map((item, index) => (
                                    <div key={index} className="flex items-center gap-2 text-sm">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                        <span className="font-medium">{item.name}: {item.value}%</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Topic Distribution */}
                <motion.div variants={staggerItem}>
                    <Card className="h-full">
                        <CardHeader>
                            <CardTitle>Topic Distribution</CardTitle>
                            <CardDescription>Key themes discussed</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={topicDistribution} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="topic" type="category" width={80} axisLine={false} tickLine={false} />
                                    <Tooltip cursor={{ fill: 'transparent' }} />
                                    <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={30} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            {/* AI Summary */}
            <motion.div variants={staggerItem}>
                <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-100">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Brain className="h-5 w-5 text-purple-600" />
                            <CardTitle>AI Executive Summary</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-gray-700 leading-relaxed">
                            The session was highly productive with strong engagement on strategic topics.
                            Participants showed particular interest in the timeline discussion, though some concerns
                            were raised regarding budget constraints. The group reached consensus on the core
                            objectives but requested a follow-up session to finalize resource allocation.
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <Badge variant="secondary" className="bg-white text-purple-700 hover:bg-white">
                                #Strategy
                            </Badge>
                            <Badge variant="secondary" className="bg-white text-purple-700 hover:bg-white">
                                #ConsensusReached
                            </Badge>
                            <Badge variant="secondary" className="bg-white text-purple-700 hover:bg-white">
                                #FollowUpRequired
                            </Badge>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </motion.div>
    );
};
