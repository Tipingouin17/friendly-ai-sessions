/**
 * Session Monitoring — Admin Component
 * View all conversations, read transcripts, force-close sessions, export transcripts, flag content.
 * Uses dedicated admin endpoints to bypass RLS.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api, { EDGE_FUNCTION_URL } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Loader2, Search, AlertTriangle, Eye, Users, MessageSquare, Clock,
    Flag, XCircle, Download, RefreshCw, ChevronLeft, ChevronRight,
    Activity, Filter, Bot, MoreHorizontal, Trash2,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface Conversation {
    id: number;
    created_at: string | null;
    session_started: boolean | null;
    is_session_ended: boolean | null;
    current_participants: number | null;
    participants: number | null;
    total_messages: number | null;
    participant_description: string | null;
    user_id: string;
    sessions_id: number | null;
    status: string | null;
    ended_at: string | null;
    session_duration_minutes: number | null;
    language: string | null;
    flow_config: Record<string, unknown> | null;
    sessions: { title: string } | null;
}

interface Message {
    id: string;
    content: string;
    role: string;
    created_at: string;
    participant_name: string | null;
}

const FLAGGED_TERMS = [
    "racist", "racism", "sexist", "sexism", "homophobic", "transphobic",
    "xenophobic", "discrimination", "bigot", "prejudice", "hate", "hatred",
    "supremacy", "supremacist", "violence", "violent", "attack", "threat",
    "harass", "harassment", "bully", "bullying", "abuse", "abusive",
];

const checkFlagged = (text: string): boolean => {
    const lower = text.toLowerCase();
    return FLAGGED_TERMS.some(t => lower.includes(t));
};

const PAGE_SIZE = 20;

const getScheduledStartIso = (flowConfig: unknown): string | null => {
    if (!flowConfig || typeof flowConfig !== "object" || Array.isArray(flowConfig)) return null;
    const value = (flowConfig as Record<string, unknown>).scheduled_start_at;
    return typeof value === "string" && value ? value : null;
};

const isFutureScheduledConversation = (conv: Conversation): boolean => {
    if (conv.is_session_ended || conv.session_started) return false;

    const scheduledStartIso = getScheduledStartIso(conv.flow_config);
    if (!scheduledStartIso) return false;

    const scheduledStartTime = new Date(scheduledStartIso).getTime();
    return Number.isFinite(scheduledStartTime) && scheduledStartTime > Date.now();
};

function getAdminAccessToken(): string {
    try {
        const session = JSON.parse(localStorage.getItem("mf_session") || "null");
        return session?.access_token || "";
    } catch {
        return "";
    }
}

async function adminEndpointFetch(path: string, init: RequestInit = {}) {
    const token = getAdminAccessToken();
    const headers = new Headers(init.headers);
    headers.set("Content-Type", headers.get("Content-Type") || "application/json");
    if (token) headers.set("Authorization", `Bearer ${token}`);

    const res = await fetch(`${EDGE_FUNCTION_URL}${path}`, {
        ...init,
        headers,
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const detail = err?.detail?.message || err?.detail || err?.message;
        throw new Error(detail || `Admin request failed with HTTP ${res.status}`);
    }

    return res;
}

export const SessionMonitoring = () => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [page, setPage] = useState(0);
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
    const [forceCloseId, setForceCloseId] = useState<number | null>(null);
    const [deleteConvId, setDeleteConvId] = useState<number | null>(null);
    const [reportConv, setReportConv] = useState<Conversation | null>(null);
    const [reportReason, setReportReason] = useState("");

    const { data: conversations, isLoading, refetch } = useQuery({
        queryKey: ["admin-conversations", statusFilter, page],
        queryFn: async () => {
            let query = api
                .from("conversations")
                .select(`
                    id, created_at, session_started, is_session_ended,
                    current_participants, participants, total_messages,
                    participant_description, user_id, sessions_id, status,
                    ended_at, session_duration_minutes, language, flow_config,
                    sessions!sessions_id ( title )
                `)
                .order("created_at", { ascending: false })
                .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

            if (statusFilter === "active") query = query.eq("is_session_ended", false).eq("session_started", true);
            if (statusFilter === "ended") query = query.eq("is_session_ended", true);
            if (statusFilter === "pending" || statusFilter === "scheduled") query = query.eq("session_started", false).eq("is_session_ended", false);

            const { data, error } = await query;
            if (error) throw error;
            return data as unknown as Conversation[];
        },
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
    });

    // Use dedicated admin endpoint to bypass RLS
    const { data: messages, isLoading: messagesLoading } = useQuery({
        queryKey: ["admin-messages", selectedConversation?.id],
        enabled: !!selectedConversation,
        queryFn: async () => {
            const res = await adminEndpointFetch(`/admin/conversations/${selectedConversation!.id}/messages`);
            const data: Message[] = await res.json();
            return data;
        },
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
    });

    const forceCloseMutation = useMutation({
        mutationFn: async (id: number) => {
            const { error } = await api
                .from("conversations")
                .update({ is_session_ended: true, status: "force_closed", ended_at: new Date().toISOString() })
                .eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-conversations"] });
            toast({ title: "Session force-closed", description: "The session has been terminated." });
            setForceCloseId(null);
        },
        onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });

    const deleteConvMutation = useMutation({
        mutationFn: async (id: number) => {
            await adminEndpointFetch(`/admin/conversations/${id}`, { method: "DELETE" });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-conversations"] });
            toast({ title: "Conversation deleted", description: "The conversation and all its data have been permanently deleted." });
            setDeleteConvId(null);
            setSelectedConversation(null);
        },
        onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });

    const reportMutation = useMutation({
        mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
            await adminEndpointFetch(`/admin/conversations/${id}/report`, {
                method: "POST",
                body: JSON.stringify({ reason }),
            });
        },
        onSuccess: () => {
            toast({ title: "Conversation reported", description: "The conversation has been flagged for review." });
            setReportConv(null);
            setReportReason("");
        },
        onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });

    const exportTranscript = () => {
        if (!messages || !selectedConversation) return;
        const lines = [
            `Session Transcript — Conversation #${selectedConversation.id}`,
            `Session: ${selectedConversation.sessions?.title ?? "Unknown"}`,
            `Date: ${selectedConversation.created_at ? format(new Date(selectedConversation.created_at), "MMMM d, yyyy HH:mm") : "Unknown"}`,
            `Participants: ${selectedConversation.participants ?? 0}`,
            `Total Messages: ${selectedConversation.total_messages ?? 0}`,
            "",
            "─".repeat(60),
            "",
            ...messages.map(m => {
                const isAI = m.role === "assistant";
                const sender = isAI ? "AI Facilitator" : (m.participant_name ?? m.role);
                return `[${format(new Date(m.created_at), "HH:mm:ss")}] ${sender}: ${m.content}`;
            }),
        ];
        const blob = new Blob([lines.join("\n")], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `transcript-${selectedConversation.id}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        toast({ title: "Transcript exported" });
    };

    const statusBadge = (conv: Conversation) => {
        if (conv.status === "force_closed") return <Badge className="bg-red-100 text-red-700 border border-red-200">Force Closed</Badge>;
        if (conv.is_session_ended) return <Badge className="bg-gray-100 text-gray-700 border border-gray-200">Ended</Badge>;
        if (conv.session_started) return <Badge className="bg-green-100 text-green-700 border border-green-200"><Activity className="h-3 w-3 mr-1" />Active</Badge>;
        if (isFutureScheduledConversation(conv)) return <Badge className="bg-blue-100 text-blue-700 border border-blue-200">Scheduled</Badge>;
        return <Badge className="bg-amber-100 text-amber-700 border border-amber-200">Pending</Badge>;
    };

    const filteredConversations = conversations?.filter(c => {
        const isFutureScheduled = isFutureScheduledConversation(c);

        if (statusFilter === "scheduled" && !isFutureScheduled) return false;
        if (statusFilter === "pending" && isFutureScheduled) return false;

        if (!searchTerm) return true;
        const q = searchTerm.toLowerCase();
        return (
            c.id.toString().includes(q) ||
            (c.sessions?.title ?? "").toLowerCase().includes(q) ||
            (c.participant_description ?? "").toLowerCase().includes(q)
        );
    });

    const hasFlaggedMessages = messages?.some(m => checkFlagged(m.content ?? ""));

    return (
        <div className="space-y-6">
            <Card className="border-purple-200 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-t-lg">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 rounded-lg">
                                <Activity className="h-6 w-6 text-purple-600" />
                            </div>
                            <div>
                                <CardTitle className="text-xl">Session Monitoring</CardTitle>
                                <CardDescription>View all conversations, transcripts, and moderate content</CardDescription>
                            </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => refetch()}>
                            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="pt-5">
                    <div className="flex flex-col sm:flex-row gap-3 mb-5">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Search by session title or ID..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(0); }}>
                            <SelectTrigger className="w-full sm:w-44">
                                <Filter className="h-4 w-4 mr-2 text-gray-400" />
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Sessions</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="ended">Ended</SelectItem>
                                <SelectItem value="scheduled">Scheduled</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {isLoading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                        </div>
                    ) : filteredConversations?.length === 0 ? (
                        <div className="text-center py-16 text-gray-500">
                            <Activity className="h-12 w-12 mx-auto mb-3 opacity-30" />
                            <p className="font-medium">No sessions found</p>
                        </div>
                    ) : (
                        <>
                            <div className="rounded-xl border overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-gray-50">
                                            <TableHead>ID</TableHead>
                                            <TableHead>Session</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Participants</TableHead>
                                            <TableHead>Messages</TableHead>
                                            <TableHead>Duration</TableHead>
                                            <TableHead>Started</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredConversations?.map(conv => (
                                            <TableRow key={conv.id} className="hover:bg-purple-50/30 transition-colors">
                                                <TableCell className="font-mono text-xs text-gray-500">#{conv.id}</TableCell>
                                                <TableCell>
                                                    <p className="font-medium text-sm text-gray-900 max-w-[160px] truncate">
                                                        {conv.sessions?.title ?? "Unknown Session"}
                                                    </p>
                                                    {conv.language && (
                                                        <p className="text-xs text-gray-400">{conv.language}</p>
                                                    )}
                                                </TableCell>
                                                <TableCell>{statusBadge(conv)}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1.5 text-sm">
                                                        <Users className="h-3.5 w-3.5 text-gray-400" />
                                                        {conv.current_participants ?? 0}/{conv.participants ?? 0}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1.5 text-sm">
                                                        <MessageSquare className="h-3.5 w-3.5 text-gray-400" />
                                                        {conv.total_messages ?? 0}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-sm text-gray-500">
                                                    {conv.session_duration_minutes
                                                        ? `${conv.session_duration_minutes}m`
                                                        : "—"}
                                                </TableCell>
                                                <TableCell className="text-xs text-gray-500">
                                                    {conv.created_at
                                                        ? formatDistanceToNow(new Date(conv.created_at), { addSuffix: true })
                                                        : "—"}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-7 text-xs"
                                                            onClick={() => setSelectedConversation(conv)}
                                                        >
                                                            <Eye className="h-3 w-3 mr-1" /> View
                                                        </Button>
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                                                    <MoreHorizontal className="h-3.5 w-3.5" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                {!conv.is_session_ended && conv.session_started && (
                                                                    <>
                                                                        <DropdownMenuItem
                                                                            className="text-red-600"
                                                                            onClick={() => setForceCloseId(conv.id)}
                                                                        >
                                                                            <XCircle className="h-4 w-4 mr-2" /> Force Close
                                                                        </DropdownMenuItem>
                                                                        <DropdownMenuSeparator />
                                                                    </>
                                                                )}
                                                                <DropdownMenuItem onClick={() => { setReportConv(conv); setReportReason(""); }}>
                                                                    <Flag className="h-4 w-4 mr-2" /> Report
                                                                </DropdownMenuItem>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem
                                                                    className="text-red-600"
                                                                    onClick={() => setDeleteConvId(conv.id)}
                                                                >
                                                                    <Trash2 className="h-4 w-4 mr-2" /> Delete
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            <div className="flex items-center justify-between mt-4">
                                <p className="text-sm text-gray-500">Page {page + 1}</p>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPage(p => Math.max(0, p - 1))}
                                        disabled={page === 0}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPage(p => p + 1)}
                                        disabled={(filteredConversations?.length ?? 0) < PAGE_SIZE}
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Transcript Viewer Dialog */}
            <Dialog open={!!selectedConversation} onOpenChange={open => !open && setSelectedConversation(null)}>
                <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <MessageSquare className="h-5 w-5 text-purple-600" />
                            Conversation #{selectedConversation?.id} — {selectedConversation?.sessions?.title ?? "Unknown Session"}
                        </DialogTitle>
                        <DialogDescription className="flex items-center gap-4 flex-wrap">
                            <span className="flex items-center gap-1">
                                <Users className="h-3.5 w-3.5" />
                                {selectedConversation?.participants ?? 0} participants
                            </span>
                            <span className="flex items-center gap-1">
                                <MessageSquare className="h-3.5 w-3.5" />
                                {selectedConversation?.total_messages ?? 0} messages
                            </span>
                            {selectedConversation?.created_at && (
                                <span className="flex items-center gap-1">
                                    <Clock className="h-3.5 w-3.5" />
                                    {format(new Date(selectedConversation.created_at), "MMM d, yyyy · HH:mm")}
                                </span>
                            )}
                            {hasFlaggedMessages && (
                                <Badge className="bg-red-100 text-red-700 border border-red-200">
                                    <AlertTriangle className="h-3 w-3 mr-1" /> Flagged Content
                                </Badge>
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto space-y-3 py-2 min-h-0">
                        {messagesLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
                            </div>
                        ) : messages?.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-30" />
                                <p>No messages in this conversation</p>
                            </div>
                        ) : (
                            messages?.map(msg => {
                                const isAI = msg.role === "assistant";
                                const isFlagged = checkFlagged(msg.content ?? "");
                                return (
                                    <div
                                        key={msg.id}
                                        className={`flex gap-3 ${isAI ? "flex-row" : "flex-row-reverse"}`}
                                    >
                                        <div className={`p-2 rounded-full h-8 w-8 flex items-center justify-center shrink-0 ${isAI ? "bg-purple-100" : "bg-blue-100"}`}>
                                            {isAI ? <Bot className="h-4 w-4 text-purple-600" /> : <Users className="h-4 w-4 text-blue-600" />}
                                        </div>
                                        <div className={`max-w-[75%] ${isAI ? "" : "items-end flex flex-col"}`}>
                                            <p className={`text-xs text-gray-400 mb-1 ${isAI ? "" : "text-right"}`}>
                                                {isAI ? "AI Facilitator" : (msg.participant_name ?? msg.role)}
                                                {" · "}
                                                {format(new Date(msg.created_at), "HH:mm")}
                                            </p>
                                            <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                                                isFlagged
                                                    ? "bg-red-50 border border-red-200 text-red-900"
                                                    : isAI
                                                        ? "bg-purple-50 border border-purple-100 text-gray-800"
                                                        : "bg-blue-50 border border-blue-100 text-gray-800"
                                            }`}>
                                                {isFlagged && (
                                                    <div className="flex items-center gap-1 text-red-600 text-xs mb-1.5 font-medium">
                                                        <Flag className="h-3 w-3" /> Flagged content
                                                    </div>
                                                )}
                                                {msg.content}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <div className="flex gap-2">
                            {selectedConversation && !selectedConversation.is_session_ended && selectedConversation.session_started && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-red-600 border-red-200 hover:bg-red-50"
                                    onClick={() => { setForceCloseId(selectedConversation.id); setSelectedConversation(null); }}
                                >
                                    <XCircle className="h-4 w-4 mr-1.5" /> Force Close
                                </Button>
                            )}
                            <Button
                                variant="outline"
                                size="sm"
                                className="text-amber-600 border-amber-200 hover:bg-amber-50"
                                onClick={() => { setReportConv(selectedConversation); setReportReason(""); setSelectedConversation(null); }}
                            >
                                <Flag className="h-4 w-4 mr-1.5" /> Report
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 border-red-200 hover:bg-red-50"
                                onClick={() => { setDeleteConvId(selectedConversation!.id); setSelectedConversation(null); }}
                            >
                                <Trash2 className="h-4 w-4 mr-1.5" /> Delete
                            </Button>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={exportTranscript} disabled={!messages?.length}>
                                <Download className="h-4 w-4 mr-1.5" /> Export
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setSelectedConversation(null)}>
                                Close
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Force Close Confirmation */}
            <AlertDialog open={!!forceCloseId} onOpenChange={open => !open && setForceCloseId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Force Close Session</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will immediately terminate conversation #{forceCloseId}. All participants will be disconnected. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => forceCloseId && forceCloseMutation.mutate(forceCloseId)}
                            disabled={forceCloseMutation.isPending}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {forceCloseMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            Force Close
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Delete Conversation Confirmation */}
            <AlertDialog open={!!deleteConvId} onOpenChange={open => !open && setDeleteConvId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                            <Trash2 className="h-5 w-5" /> Delete Conversation
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete conversation #{deleteConvId} and all its messages, participants, and reports. This action <strong>cannot be undone</strong>.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => deleteConvId && deleteConvMutation.mutate(deleteConvId)}
                            disabled={deleteConvMutation.isPending}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {deleteConvMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            Delete Permanently
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Report Conversation Dialog */}
            <Dialog open={!!reportConv} onOpenChange={open => !open && setReportConv(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Flag className="h-5 w-5 text-amber-500" />
                            Report Conversation #{reportConv?.id}
                        </DialogTitle>
                        <DialogDescription>
                            Flag this conversation for review. Provide a reason to help with moderation.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <Textarea
                            placeholder="Reason for reporting (e.g., inappropriate content, policy violation...)"
                            value={reportReason}
                            onChange={e => setReportReason(e.target.value)}
                            rows={4}
                            className="resize-none"
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" onClick={() => setReportConv(null)}>Cancel</Button>
                        <Button
                            className="bg-amber-500 hover:bg-amber-600 text-white"
                            onClick={() => reportConv && reportMutation.mutate({ id: reportConv.id, reason: reportReason || "Flagged by admin" })}
                            disabled={reportMutation.isPending}
                        >
                            {reportMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            <Flag className="h-4 w-4 mr-1.5" /> Submit Report
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};
