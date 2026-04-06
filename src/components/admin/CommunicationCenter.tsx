/**
 * Communication Center — Admin Component
 * Manage contact form messages and FAQ content.
 * Uses real `contact_form` and `faqs` tables from the database.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    Loader2, Mail, MessageSquare, HelpCircle, CheckCircle,
    RefreshCw, Plus, Pencil, Trash2, Search, Filter, Eye,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface ContactMessage {
    id: number;
    fname: string | null;
    lname: string | null;
    email: string | null;
    message: string | null;
    user_id: number | null;
    responded: boolean | null;
    created_at: string | null;
}

interface FAQ {
    id: number;
    title: string | null;
    description: string | null;
    status: boolean | null;
    created_at: string | null;
    category: string | null;
}

const FAQ_CATEGORIES = ["General", "Billing", "Sessions", "Facilitators", "Technical", "Account"];

export const CommunicationCenter = () => {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [activeTab, setActiveTab] = useState("messages");
    const [searchMessages, setSearchMessages] = useState("");
    const [messageFilter, setMessageFilter] = useState("all");
    const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);

    const [faqSearch, setFaqSearch] = useState("");
    const [faqCategoryFilter, setFaqCategoryFilter] = useState("all");
    const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);
    const [deletingFaqId, setDeletingFaqId] = useState<number | null>(null);
    const [isCreatingFaq, setIsCreatingFaq] = useState(false);
    const [faqForm, setFaqForm] = useState({ title: "", description: "", category: "General", status: true });

    const { data: messages, isLoading: messagesLoading, refetch: refetchMessages } = useQuery({
        queryKey: ["admin-contact-messages", messageFilter],
        queryFn: async () => {
            let query = supabase
                .from("contact_form")
                .select("*")
                .order("created_at", { ascending: false });
            if (messageFilter === "unread") query = query.eq("responded", false);
            if (messageFilter === "responded") query = query.eq("responded", true);
            const { data, error } = await query;
            if (error) throw error;
            return data as ContactMessage[];
        },
    });

    const { data: faqs, isLoading: faqsLoading } = useQuery({
        queryKey: ["admin-faqs", faqCategoryFilter],
        queryFn: async () => {
            let query = supabase
                .from("faqs")
                .select("*")
                .order("created_at", { ascending: false });
            if (faqCategoryFilter !== "all") query = query.eq("category", faqCategoryFilter);
            const { data, error } = await query;
            if (error) throw error;
            return data as FAQ[];
        },
    });

    const markRespondedMutation = useMutation({
        mutationFn: async ({ id, responded }: { id: number; responded: boolean }) => {
            const { error } = await supabase
                .from("contact_form")
                .update({ responded })
                .eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-contact-messages"] });
            toast({ title: "Updated", description: "Message status updated." });
        },
        onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });

    const saveFaqMutation = useMutation({
        mutationFn: async (faq: { id?: number; title: string; description: string; category: string; status: boolean }) => {
            if (faq.id) {
                const { error } = await supabase
                    .from("faqs")
                    .update({ title: faq.title, description: faq.description, category: faq.category, status: faq.status })
                    .eq("id", faq.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from("faqs")
                    .insert({ title: faq.title, description: faq.description, category: faq.category, status: faq.status } as any);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-faqs"] });
            toast({ title: "FAQ saved" });
            setEditingFaq(null);
            setIsCreatingFaq(false);
            setFaqForm({ title: "", description: "", category: "General", status: true });
        },
        onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });

    const deleteFaqMutation = useMutation({
        mutationFn: async (id: number) => {
            const { error } = await supabase.from("faqs").delete().eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-faqs"] });
            toast({ title: "FAQ deleted" });
            setDeletingFaqId(null);
        },
        onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });

    const toggleFaqStatus = useMutation({
        mutationFn: async ({ id, status }: { id: number; status: boolean }) => {
            const { error } = await supabase.from("faqs").update({ status }).eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-faqs"] }),
        onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });

    const openEditFaq = (faq: FAQ) => {
        setEditingFaq(faq);
        setFaqForm({
            title: faq.title ?? "",
            description: faq.description ?? "",
            category: faq.category ?? "General",
            status: faq.status ?? true,
        });
    };

    const filteredMessages = messages?.filter(m => {
        if (!searchMessages) return true;
        const q = searchMessages.toLowerCase();
        return (
            (m.fname ?? "").toLowerCase().includes(q) ||
            (m.lname ?? "").toLowerCase().includes(q) ||
            (m.email ?? "").toLowerCase().includes(q) ||
            (m.message ?? "").toLowerCase().includes(q)
        );
    });

    const filteredFaqs = faqs?.filter(f => {
        if (!faqSearch) return true;
        const q = faqSearch.toLowerCase();
        return (
            (f.title ?? "").toLowerCase().includes(q) ||
            (f.description ?? "").toLowerCase().includes(q)
        );
    });

    const unreadCount = messages?.filter(m => !m.responded).length ?? 0;

    return (
        <div className="space-y-6">
            <Card className="border-purple-200 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-t-lg">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                            <MessageSquare className="h-6 w-6 text-purple-600" />
                        </div>
                        <div>
                            <CardTitle className="text-xl">Communication Center</CardTitle>
                            <CardDescription>Manage contact messages and FAQ content</CardDescription>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="pt-5">
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="bg-gray-100 p-1 rounded-lg mb-6">
                            <TabsTrigger value="messages" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                <Mail className="h-4 w-4" />
                                Messages
                                {unreadCount > 0 && (
                                    <Badge className="bg-red-500 text-white text-xs h-4 min-w-4 px-1 ml-1">{unreadCount}</Badge>
                                )}
                            </TabsTrigger>
                            <TabsTrigger value="faqs" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                <HelpCircle className="h-4 w-4" />
                                FAQ Management
                            </TabsTrigger>
                        </TabsList>

                        {/* Messages Tab */}
                        <TabsContent value="messages" className="space-y-4">
                            <div className="flex flex-col sm:flex-row gap-3">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        placeholder="Search messages..."
                                        value={searchMessages}
                                        onChange={e => setSearchMessages(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>
                                <Select value={messageFilter} onValueChange={setMessageFilter}>
                                    <SelectTrigger className="w-full sm:w-44">
                                        <Filter className="h-4 w-4 mr-2 text-gray-400" />
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Messages</SelectItem>
                                        <SelectItem value="unread">Unread</SelectItem>
                                        <SelectItem value="responded">Responded</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Button variant="outline" size="sm" onClick={() => refetchMessages()}>
                                    <RefreshCw className="h-4 w-4" />
                                </Button>
                            </div>

                            {messagesLoading ? (
                                <div className="flex items-center justify-center py-16">
                                    <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                                </div>
                            ) : filteredMessages?.length === 0 ? (
                                <div className="text-center py-16 text-gray-500">
                                    <Mail className="h-12 w-12 mx-auto mb-3 opacity-30" />
                                    <p className="font-medium">No messages found</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {filteredMessages?.map(msg => (
                                        <div
                                            key={msg.id}
                                            className={`p-4 rounded-xl border transition-all ${
                                                !msg.responded
                                                    ? "bg-blue-50 border-blue-200"
                                                    : "bg-gray-50 border-gray-100"
                                            }`}
                                        >
                                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                                <div className="flex items-start gap-3">
                                                    <div className={`p-2 rounded-full shrink-0 ${!msg.responded ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-400"}`}>
                                                        <Mail className="h-4 w-4" />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <p className="font-semibold text-gray-900 text-sm">
                                                                {[msg.fname, msg.lname].filter(Boolean).join(" ") || "Anonymous"}
                                                            </p>
                                                            {!msg.responded && (
                                                                <Badge className="bg-blue-100 text-blue-700 border border-blue-200 text-xs">New</Badge>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-gray-500">{msg.email}</p>
                                                        <p className="text-sm text-gray-700 mt-1.5 line-clamp-2">{msg.message}</p>
                                                        <p className="text-xs text-gray-400 mt-1">
                                                            {msg.created_at && formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-7 text-xs"
                                                        onClick={() => setSelectedMessage(msg)}
                                                    >
                                                        <Eye className="h-3 w-3 mr-1" /> View
                                                    </Button>
                                                    <Button
                                                        variant={msg.responded ? "outline" : "default"}
                                                        size="sm"
                                                        className={`h-7 text-xs ${!msg.responded ? "bg-green-600 hover:bg-green-700" : ""}`}
                                                        onClick={() => markRespondedMutation.mutate({ id: msg.id, responded: !msg.responded })}
                                                        disabled={markRespondedMutation.isPending}
                                                    >
                                                        <CheckCircle className="h-3 w-3 mr-1" />
                                                        {msg.responded ? "Mark Unread" : "Mark Responded"}
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </TabsContent>

                        {/* FAQ Tab */}
                        <TabsContent value="faqs" className="space-y-4">
                            <div className="flex flex-col sm:flex-row gap-3">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        placeholder="Search FAQs..."
                                        value={faqSearch}
                                        onChange={e => setFaqSearch(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>
                                <Select value={faqCategoryFilter} onValueChange={setFaqCategoryFilter}>
                                    <SelectTrigger className="w-full sm:w-44">
                                        <SelectValue placeholder="Category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Categories</SelectItem>
                                        {FAQ_CATEGORIES.map(c => (
                                            <SelectItem key={c} value={c}>{c}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Button
                                    className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                                    onClick={() => {
                                        setIsCreatingFaq(true);
                                        setFaqForm({ title: "", description: "", category: "General", status: true });
                                    }}
                                >
                                    <Plus className="h-4 w-4 mr-1" /> New FAQ
                                </Button>
                            </div>

                            {faqsLoading ? (
                                <div className="flex items-center justify-center py-16">
                                    <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                                </div>
                            ) : filteredFaqs?.length === 0 ? (
                                <div className="text-center py-16 text-gray-500">
                                    <HelpCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                                    <p className="font-medium">No FAQs found</p>
                                    <Button variant="outline" className="mt-4" onClick={() => setIsCreatingFaq(true)}>
                                        <Plus className="h-4 w-4 mr-1" /> Create your first FAQ
                                    </Button>
                                </div>
                            ) : (
                                <div className="rounded-xl border overflow-hidden">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-gray-50">
                                                <TableHead>Question</TableHead>
                                                <TableHead>Category</TableHead>
                                                <TableHead>Published</TableHead>
                                                <TableHead>Created</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredFaqs?.map(faq => (
                                                <TableRow key={faq.id} className="hover:bg-purple-50/30 transition-colors">
                                                    <TableCell>
                                                        <div>
                                                            <p className="font-medium text-gray-900 text-sm">{faq.title}</p>
                                                            <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{faq.description}</p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className="text-xs">{faq.category ?? "General"}</Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Switch
                                                            checked={faq.status ?? false}
                                                            onCheckedChange={v => toggleFaqStatus.mutate({ id: faq.id, status: v })}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="text-sm text-gray-500">
                                                        {faq.created_at && format(new Date(faq.created_at), "MMM d, yyyy")}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="h-7 text-xs"
                                                                onClick={() => openEditFaq(faq)}
                                                            >
                                                                <Pencil className="h-3 w-3 mr-1" /> Edit
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50"
                                                                onClick={() => setDeletingFaqId(faq.id)}
                                                            >
                                                                <Trash2 className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            {/* Message Viewer Dialog */}
            <Dialog open={!!selectedMessage} onOpenChange={open => !open && setSelectedMessage(null)}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Mail className="h-5 w-5 text-purple-600" />
                            Message from {[selectedMessage?.fname, selectedMessage?.lname].filter(Boolean).join(" ") || "Anonymous"}
                        </DialogTitle>
                        <DialogDescription>
                            {selectedMessage?.email}
                            {selectedMessage?.created_at && ` · ${format(new Date(selectedMessage.created_at), "MMMM d, yyyy · HH:mm")}`}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed min-h-[80px]">
                        {selectedMessage?.message}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSelectedMessage(null)}>Close</Button>
                        {selectedMessage && !selectedMessage.responded && (
                            <Button
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => {
                                    markRespondedMutation.mutate({ id: selectedMessage.id, responded: true });
                                    setSelectedMessage(null);
                                }}
                            >
                                <CheckCircle className="h-4 w-4 mr-2" /> Mark as Responded
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* FAQ Create / Edit Dialog */}
            <Dialog
                open={isCreatingFaq || !!editingFaq}
                onOpenChange={open => { if (!open) { setIsCreatingFaq(false); setEditingFaq(null); } }}
            >
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editingFaq ? "Edit FAQ" : "Create New FAQ"}</DialogTitle>
                        <DialogDescription>
                            {editingFaq ? "Update the question and answer." : "Add a new FAQ entry to the help center."}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="faq-title" className="font-semibold">Question</Label>
                            <Input
                                id="faq-title"
                                value={faqForm.title}
                                onChange={e => setFaqForm(f => ({ ...f, title: e.target.value }))}
                                placeholder="e.g. How do I reset my password?"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="faq-desc" className="font-semibold">Answer</Label>
                            <Textarea
                                id="faq-desc"
                                value={faqForm.description}
                                onChange={e => setFaqForm(f => ({ ...f, description: e.target.value }))}
                                rows={4}
                                placeholder="Provide a clear and helpful answer..."
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="font-semibold">Category</Label>
                                <Select value={faqForm.category} onValueChange={v => setFaqForm(f => ({ ...f, category: v }))}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {FAQ_CATEGORIES.map(c => (
                                            <SelectItem key={c} value={c}>{c}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="font-semibold">Published</Label>
                                <div className="flex items-center gap-2 mt-2">
                                    <Switch
                                        checked={faqForm.status}
                                        onCheckedChange={v => setFaqForm(f => ({ ...f, status: v }))}
                                    />
                                    <span className="text-sm text-gray-600">{faqForm.status ? "Visible" : "Hidden"}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setIsCreatingFaq(false); setEditingFaq(null); }}>
                            Cancel
                        </Button>
                        <Button
                            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                            onClick={() => saveFaqMutation.mutate({ ...faqForm, id: editingFaq?.id })}
                            disabled={saveFaqMutation.isPending || !faqForm.title.trim()}
                        >
                            {saveFaqMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            {editingFaq ? "Save Changes" : "Create FAQ"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete FAQ Confirmation */}
            <AlertDialog open={!!deletingFaqId} onOpenChange={open => !open && setDeletingFaqId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete FAQ</AlertDialogTitle>
                        <AlertDialogDescription>
                            This FAQ will be permanently deleted and removed from the help center. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => deletingFaqId && deleteFaqMutation.mutate(deletingFaqId)}
                            disabled={deleteFaqMutation.isPending}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {deleteFaqMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};
