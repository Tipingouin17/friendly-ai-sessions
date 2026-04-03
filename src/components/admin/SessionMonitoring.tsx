/**
 * Session Monitoring
 *
 * Admin component for the AIfacilitator application.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Loader2,
    Search,
    AlertTriangle,
    Eye,
    Users,
    MessageSquare,
    Clock,
    Flag
} from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface Conversation {
    id: number;
    created_at: string;
    session_started: boolean;
    is_session_ended: boolean;
    current_participants: number;
    participants: number;
    total_messages: number;
    participant_description: string;
    sessions: {
        title: string;
    } | null;
}

interface Message {
    id: string;
    content: string;
    sender: string;
    created_at: string;
    participant_name: string | null;
}

// Content moderation keywords
const FLAGGED_TERMS = [
    // Discrimination
    'racist', 'racism', 'sexist', 'sexism', 'homophobic', 'transphobic',
    'xenophobic', 'discrimination', 'discriminate', 'bigot', 'prejudice',
    // Hate speech
    'hate', 'hatred', 'supremacy', 'supremacist',
    // Violence
    'violence', 'violent', 'attack', 'threat', 'threaten',
    // Harassment
    'harass', 'harassment', 'bully', 'bullying', 'abuse', 'abusive'
];

const checkForFlaggedContent = (text: string): boolean => {
    const lowerText = text.toLowerCase();
    return FLAGGED_TERMS.some(term => lowerText.includes(term));
};

export const SessionMonitoring = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedSession, setSelectedSession] = useState<number | null>(null);

    // Fetch all conversations
    const { data: conversations, isLoading } = useQuery({
        queryKey: ['admin-conversations', searchTerm],
        queryFn: async () => {
            const query = supabase
                .from('conversations')
                .select(`
          id,
          created_at,
          session_started,
          is_session_ended,
          current_participants,
          participants,
          total_messages,
          participant_description,
          sessions (
            title
          )
        `)
                .order('created_at', { ascending: false })
                .limit(100);

            const { data, error } = await query;
            if (error) throw error;
            return data as Conversation[];
        }
    });

    // Fetch messages for selected session
    const { data: messages, isLoading: isLoadingMessages } = useQuery({
        queryKey: ['admin-messages', selectedSession],
        queryFn: async () => {
            if (!selectedSession) return [];

            const { data, error } = await supabase
                .from('messages')
                .select(`
          id,
          content,
          sender,
          created_at,
          participant_name
        `)
                .eq('conversation_id', selectedSession)
                .order('created_at', { ascending: true });

            if (error) throw error;
            return data as Message[];
        },
        enabled: !!selectedSession
    });

    const flaggedMessages = messages?.filter(msg => checkForFlaggedContent(msg.content)) || [];
    const selectedConversation = conversations?.find(c => c.id === selectedSession);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Card className="border-purple-200 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50">
                    <div className="flex items-center gap-2">
                        <Eye className="h-6 w-6 text-purple-600" />
                        <CardTitle className="text-2xl">Session Monitoring</CardTitle>
                    </div>
                    <CardDescription>
                        Monitor all sessions and flag inappropriate content
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                    {/* Search */}
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Search sessions..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>

                    {/* Sessions Table */}
                    <div className="border rounded-lg overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-gray-50">
                                    <TableHead>Session</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Participants</TableHead>
                                    <TableHead>Messages</TableHead>
                                    <TableHead>Created</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {conversations?.map((conversation) => (
                                    <TableRow key={conversation.id}>
                                        <TableCell>
                                            <div>
                                                <div className="font-medium">
                                                    {conversation.sessions?.title || 'Untitled Session'}
                                                </div>
                                                {conversation.participant_description && (
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        {conversation.participant_description.substring(0, 50)}...
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {conversation.is_session_ended ? (
                                                <Badge variant="outline">Ended</Badge>
                                            ) : conversation.session_started ? (
                                                <Badge className="bg-green-100 text-green-800">Active</Badge>
                                            ) : (
                                                <Badge variant="secondary">Waiting</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <Users className="h-4 w-4 text-gray-400" />
                                                <span>{conversation.current_participants}/{conversation.participants}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <MessageSquare className="h-4 w-4 text-gray-400" />
                                                <span>{conversation.total_messages || 0}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1 text-sm text-gray-600">
                                                <Clock className="h-3 w-3" />
                                                {format(new Date(conversation.created_at), 'MMM d, HH:mm')}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setSelectedSession(conversation.id)}
                                            >
                                                <Eye className="h-4 w-4 mr-1" />
                                                View
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    {conversations?.length === 0 && (
                        <div className="text-center py-12 text-gray-500">
                            No sessions found
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Message Viewer Dialog */}
            <Dialog open={!!selectedSession} onOpenChange={() => setSelectedSession(null)}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {selectedConversation?.sessions?.title || 'Session Messages'}
                            {flaggedMessages.length > 0 && (
                                <Badge variant="destructive" className="ml-2">
                                    <Flag className="h-3 w-3 mr-1" />
                                    {flaggedMessages.length} Flagged
                                </Badge>
                            )}
                        </DialogTitle>
                        <DialogDescription>
                            Review all messages from this session
                        </DialogDescription>
                    </DialogHeader>

                    {isLoadingMessages ? (
                        <div className="flex items-center justify-center p-8">
                            <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                    ) : (
                        <div className="space-y-4 mt-4">
                            {flaggedMessages.length > 0 && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                    <div className="flex items-center gap-2 text-red-800 font-semibold mb-2">
                                        <AlertTriangle className="h-5 w-5" />
                                        Flagged Content Detected
                                    </div>
                                    <p className="text-sm text-red-700">
                                        {flaggedMessages.length} message(s) contain potentially inappropriate content
                                    </p>
                                </div>
                            )}

                            <div className="space-y-3">
                                {messages?.map((message) => {
                                    const isFlagged = checkForFlaggedContent(message.content);
                                    return (
                                        <div
                                            key={message.id}
                                            className={`p-4 rounded-lg border ${isFlagged
                                                    ? 'bg-red-50 border-red-300'
                                                    : 'bg-gray-50 border-gray-200'
                                                }`}
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant={message.sender === 'assistant' ? 'default' : 'outline'}>
                                                        {message.sender === 'assistant' ? 'AI' : message.participant_name || 'Participant'}
                                                    </Badge>
                                                    {isFlagged && (
                                                        <Badge variant="destructive">
                                                            <Flag className="h-3 w-3 mr-1" />
                                                            Flagged
                                                        </Badge>
                                                    )}
                                                </div>
                                                <span className="text-xs text-gray-500">
                                                    {format(new Date(message.created_at), 'HH:mm:ss')}
                                                </span>
                                            </div>
                                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                                        </div>
                                    );
                                })}
                            </div>

                            {messages?.length === 0 && (
                                <div className="text-center py-8 text-gray-500">
                                    No messages in this session yet
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};
