import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
    Loader2,
    Send,
    Mail,
    Bell,
    MessageSquare,
    Users,
    CheckCircle,
    Clock,
    Filter
} from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface Announcement {
    id: string;
    title: string;
    content: string;
    type: 'email' | 'in_app' | 'banner';
    target_audience: 'all' | 'free' | 'premium' | 'active' | 'inactive';
    status: 'draft' | 'scheduled' | 'sent';
    scheduled_for: string | null;
    created_at: string;
    sent_at: string | null;
    sent_count: number;
}

interface SupportTicket {
    id: string;
    user_email: string;
    subject: string;
    message: string;
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    created_at: string;
    updated_at: string;
}

export const CommunicationCenter = () => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState("announcements");
    const [newAnnouncement, setNewAnnouncement] = useState({
        title: "",
        content: "",
        type: "in_app",
        target_audience: "all"
    });

    // Fetch announcements (mock for now, would need a real table)
    const { data: announcements, isLoading: isLoadingAnnouncements } = useQuery({
        queryKey: ['admin-announcements'],
        queryFn: async () => {
            // In a real app, fetch from 'announcements' table
            // For now, return mock data
            return [
                {
                    id: '1',
                    title: 'New Feature: AI Facilitator 2.0',
                    content: 'We have updated our AI models to provide better facilitation.',
                    type: 'in_app',
                    target_audience: 'all',
                    status: 'sent',
                    scheduled_for: null,
                    created_at: new Date(Date.now() - 86400000).toISOString(),
                    sent_at: new Date(Date.now() - 80000000).toISOString(),
                    sent_count: 1250
                },
                {
                    id: '2',
                    title: 'Maintenance Scheduled',
                    content: 'Platform will be down for 30 mins on Sunday.',
                    type: 'banner',
                    target_audience: 'all',
                    status: 'scheduled',
                    scheduled_for: new Date(Date.now() + 86400000).toISOString(),
                    created_at: new Date().toISOString(),
                    sent_at: null,
                    sent_count: 0
                }
            ] as Announcement[];
        }
    });

    // Fetch support tickets (mock for now)
    const { data: tickets, isLoading: isLoadingTickets } = useQuery({
        queryKey: ['admin-tickets'],
        queryFn: async () => {
            // In a real app, fetch from 'support_tickets' table
            return [
                {
                    id: 't1',
                    user_email: 'user@domain.com',
                    subject: 'Cannot access premium features',
                    message: 'I upgraded yesterday but still see free plan limits.',
                    status: 'open',
                    priority: 'high',
                    created_at: new Date(Date.now() - 3600000).toISOString(),
                    updated_at: new Date(Date.now() - 3600000).toISOString()
                },
                {
                    id: 't2',
                    user_email: 'facilitator@domain.com',
                    subject: 'Feature request',
                    message: 'Can we have custom branding?',
                    status: 'in_progress',
                    priority: 'low',
                    created_at: new Date(Date.now() - 172800000).toISOString(),
                    updated_at: new Date(Date.now() - 86400000).toISOString()
                }
            ] as SupportTicket[];
        }
    });

    const handleCreateAnnouncement = () => {
        toast({
            title: "Announcement Created",
            description: "Your announcement has been scheduled successfully.",
        });
        setNewAnnouncement({
            title: "",
            content: "",
            type: "in_app",
            target_audience: "all"
        });
    };

    return (
        <div className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="announcements" className="flex items-center gap-2">
                        <Bell className="h-4 w-4" />
                        Announcements & Campaigns
                    </TabsTrigger>
                    <TabsTrigger value="support" className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Support Tickets
                    </TabsTrigger>
                </TabsList>

                {/* Announcements Tab */}
                <TabsContent value="announcements" className="space-y-6 mt-6">
                    <div className="grid md:grid-cols-3 gap-6">
                        {/* Create Announcement */}
                        <Card className="md:col-span-1 border-purple-200 shadow-md h-fit">
                            <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50">
                                <div className="flex items-center gap-2">
                                    <Send className="h-5 w-5 text-purple-600" />
                                    <CardTitle className="text-lg">New Campaign</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="type">Campaign Type</Label>
                                    <Select
                                        value={newAnnouncement.type}
                                        onValueChange={(val) => setNewAnnouncement({ ...newAnnouncement, type: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="email">
                                                <div className="flex items-center gap-2">
                                                    <Mail className="h-4 w-4" /> Email Blast
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="in_app">
                                                <div className="flex items-center gap-2">
                                                    <Bell className="h-4 w-4" /> In-App Notification
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="banner">
                                                <div className="flex items-center gap-2">
                                                    <MessageSquare className="h-4 w-4" /> Global Banner
                                                </div>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="audience">Target Audience</Label>
                                    <Select
                                        value={newAnnouncement.target_audience}
                                        onValueChange={(val) => setNewAnnouncement({ ...newAnnouncement, target_audience: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select audience" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Users</SelectItem>
                                            <SelectItem value="free">Free Plan Users</SelectItem>
                                            <SelectItem value="premium">Premium Users</SelectItem>
                                            <SelectItem value="inactive">Inactive Users (30d+)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="title">Title / Subject</Label>
                                    <Input
                                        id="title"
                                        placeholder="Enter title..."
                                        value={newAnnouncement.title}
                                        onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="content">Message Content</Label>
                                    <Textarea
                                        id="content"
                                        placeholder="Enter your message..."
                                        rows={5}
                                        value={newAnnouncement.content}
                                        onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                                    />
                                </div>

                                <Button
                                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600"
                                    onClick={handleCreateAnnouncement}
                                >
                                    <Send className="h-4 w-4 mr-2" />
                                    Send / Schedule
                                </Button>
                            </CardContent>
                        </Card>

                        {/* History */}
                        <Card className="md:col-span-2 border-gray-200 shadow-md">
                            <CardHeader>
                                <CardTitle>Campaign History</CardTitle>
                                <CardDescription>Recent announcements and their performance</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {announcements?.map((item) => (
                                        <div key={item.id} className="flex items-start justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-semibold">{item.title}</h4>
                                                    <Badge variant={item.status === 'sent' ? 'default' : 'secondary'}>
                                                        {item.status}
                                                    </Badge>
                                                    <Badge variant="outline" className="capitalize">
                                                        {item.type.replace('_', ' ')}
                                                    </Badge>
                                                </div>
                                                <p className="text-sm text-gray-600 line-clamp-1">{item.content}</p>
                                                <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                                                    <span className="flex items-center gap-1">
                                                        <Users className="h-3 w-3" />
                                                        Target: {item.target_audience}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <CheckCircle className="h-3 w-3" />
                                                        Sent: {item.sent_count}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        {item.sent_at
                                                            ? format(new Date(item.sent_at), 'MMM d, HH:mm')
                                                            : `Scheduled: ${format(new Date(item.scheduled_for!), 'MMM d, HH:mm')}`
                                                        }
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Support Tickets Tab */}
                <TabsContent value="support" className="space-y-6 mt-6">
                    <Card className="border-gray-200 shadow-md">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Support Tickets</CardTitle>
                                <CardDescription>Manage user inquiries and issues</CardDescription>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm">
                                    <Filter className="h-4 w-4 mr-2" />
                                    Filter
                                </Button>
                                <Button variant="outline" size="sm">
                                    Export CSV
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {tickets?.map((ticket) => (
                                    <div key={ticket.id} className="flex items-start justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                                        <div className="flex gap-4">
                                            <div className={`mt-1 p-2 rounded-full ${ticket.priority === 'high' || ticket.priority === 'urgent'
                                                    ? 'bg-red-100 text-red-600'
                                                    : 'bg-blue-100 text-blue-600'
                                                }`}>
                                                <MessageSquare className="h-4 w-4" />
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-semibold">{ticket.subject}</h4>
                                                    <Badge className={`${ticket.status === 'open' ? 'bg-green-500' :
                                                            ticket.status === 'in_progress' ? 'bg-blue-500' : 'bg-gray-500'
                                                        }`}>
                                                        {ticket.status.replace('_', ' ')}
                                                    </Badge>
                                                    <Badge variant="outline" className={`${ticket.priority === 'high' ? 'text-red-600 border-red-200' : ''
                                                        }`}>
                                                        {ticket.priority}
                                                    </Badge>
                                                </div>
                                                <p className="text-sm text-gray-600">{ticket.message}</p>
                                                <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                                                    <span>From: {ticket.user_email}</span>
                                                    <span>Created: {format(new Date(ticket.created_at), 'MMM d, HH:mm')}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="sm">View Details</Button>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};
