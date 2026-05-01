/**
 * Session Management Modal
 *
 * Profile component for the AIfacilitator application.
 */
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from "@/lib/api";
import { format, formatDistanceToNow } from 'date-fns';
import { Laptop, Smartphone, Tablet, Monitor, Globe, MapPin, Clock, AlertCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface SessionManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface UserSession {
    id: string;
    device_name: string | null;
    device_type: string | null;
    browser: string | null;
    os: string | null;
    ip_address: string | null;
    location: string | null;
    user_agent: string | null;
    is_current: boolean;
    last_activity: string;
    created_at: string;
}

export const SessionManagementModal: React.FC<SessionManagementModalProps> = ({ isOpen, onClose }) => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [revokingId, setRevokingId] = useState<string | null>(null);

    const { data: sessions, isLoading } = useQuery({
        queryKey: ['userSessions'],
        queryFn: async () => {
            const { data, error } = await api
                .from('user_sessions')
                .select('*')
                .is('revoked_at', null)
                .order('last_activity', { ascending: false });

            if (error) throw error;
            return data as UserSession[];
        },
        enabled: isOpen,
    });

    const revokeSessionMutation = useMutation({
        mutationFn: async (sessionId: string) => {
            const { error } = await api
                .from('user_sessions')
                .update({ revoked_at: new Date().toISOString() })
                .eq('id', sessionId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['userSessions'] });
            toast({
                title: "Session Revoked",
                description: "The session has been successfully revoked.",
            });
            setRevokingId(null);
        },
        onError: (error) => {
            toast({
                title: "Error",
                description: "Failed to revoke session. Please try again.",
                variant: "destructive",
            });
            setRevokingId(null);
        },
    });

    const handleRevokeSession = (sessionId: string) => {
        setRevokingId(sessionId);
        revokeSessionMutation.mutate(sessionId);
    };

    const getDeviceIcon = (deviceType: string | null, userAgent: string | null) => {
        if (deviceType === 'mobile' || userAgent?.toLowerCase().includes('mobile')) {
            return <Smartphone className="h-5 w-5 text-blue-500" />;
        }
        if (deviceType === 'tablet' || userAgent?.toLowerCase().includes('tablet')) {
            return <Tablet className="h-5 w-5 text-purple-500" />;
        }
        return <Laptop className="h-5 w-5 text-gray-500" />;
    };

    const getDeviceName = (session: UserSession) => {
        if (session.device_name) return session.device_name;
        if (session.browser && session.os) return `${session.browser} on ${session.os}`;
        if (session.browser) return session.browser;
        return 'Unknown Device';
    };

    const currentSession = sessions?.find(s => s.is_current);
    const otherSessions = sessions?.filter(s => !s.is_current) || [];

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[700px] bg-white max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle>Active Sessions</DialogTitle>
                    <DialogDescription>
                        Manage your active sessions across all devices. You can revoke access from any device.
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="h-[500px] pr-4">
                    {isLoading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                                    <Skeleton className="h-12 w-12 rounded-full" />
                                    <div className="space-y-2 flex-1">
                                        <Skeleton className="h-4 w-1/3" />
                                        <Skeleton className="h-3 w-1/2" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : sessions?.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            No active sessions found.
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Current Session */}
                            {currentSession && (
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-500 mb-3 uppercase">Current Session</h3>
                                    <div className="p-4 border-2 border-green-200 bg-green-50 rounded-lg">
                                        <div className="flex items-start gap-4">
                                            <div className="p-3 bg-white rounded-full">
                                                {getDeviceIcon(currentSession.device_type, currentSession.user_agent)}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h4 className="font-semibold text-sm flex items-center gap-2">
                                                            {getDeviceName(currentSession)}
                                                            <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded-full">
                                                                Current
                                                            </span>
                                                        </h4>
                                                        <div className="mt-2 space-y-1">
                                                            <div className="flex items-center gap-2 text-xs text-gray-600">
                                                                <Globe size={12} />
                                                                <span>IP: {currentSession.ip_address || 'Unknown'}</span>
                                                            </div>
                                                            {currentSession.location && (
                                                                <div className="flex items-center gap-2 text-xs text-gray-600">
                                                                    <MapPin size={12} />
                                                                    <span>{currentSession.location}</span>
                                                                </div>
                                                            )}
                                                            <div className="flex items-center gap-2 text-xs text-gray-600">
                                                                <Clock size={12} />
                                                                <span>Last active: {formatDistanceToNow(new Date(currentSession.last_activity), { addSuffix: true })}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Other Sessions */}
                            {otherSessions.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-500 mb-3 uppercase">Other Sessions</h3>
                                    <div className="space-y-3">
                                        {otherSessions.map((session) => (
                                            <div key={session.id} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                                                <div className="flex items-start gap-4">
                                                    <div className="p-3 bg-gray-100 rounded-full">
                                                        {getDeviceIcon(session.device_type, session.user_agent)}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <h4 className="font-semibold text-sm">{getDeviceName(session)}</h4>
                                                                <div className="mt-2 space-y-1">
                                                                    <div className="flex items-center gap-2 text-xs text-gray-600">
                                                                        <Globe size={12} />
                                                                        <span>IP: {session.ip_address || 'Unknown'}</span>
                                                                    </div>
                                                                    {session.location && (
                                                                        <div className="flex items-center gap-2 text-xs text-gray-600">
                                                                            <MapPin size={12} />
                                                                            <span>{session.location}</span>
                                                                        </div>
                                                                    )}
                                                                    <div className="flex items-center gap-2 text-xs text-gray-600">
                                                                        <Clock size={12} />
                                                                        <span>Last active: {formatDistanceToNow(new Date(session.last_activity), { addSuffix: true })}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <Button
                                                                variant="destructive"
                                                                size="sm"
                                                                onClick={() => handleRevokeSession(session.id)}
                                                                disabled={revokingId === session.id}
                                                            >
                                                                {revokingId === session.id ? 'Revoking...' : 'Revoke'}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Info Alert */}
                            <Alert>
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Session Security</AlertTitle>
                                <AlertDescription>
                                    If you see a session you don't recognize, revoke it immediately and change your password.
                                    Sessions automatically expire after 30 days of inactivity.
                                </AlertDescription>
                            </Alert>
                        </div>
                    )}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
};
