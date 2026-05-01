/**
 * Login Activity Modal
 *
 * Profile component for the AIfacilitator application.
 */
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useQuery } from '@tanstack/react-query';
import api from "@/lib/api";
import { format } from 'date-fns';
import { Laptop, Smartphone, Globe, MapPin } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

interface LoginActivityModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface LoginActivity {
    id: string;
    ip_address: string | null;
    user_agent: string | null;
    location: string | null;
    created_at: string;
}

export const LoginActivityModal: React.FC<LoginActivityModalProps> = ({ isOpen, onClose }) => {
    const { data: activities, isLoading } = useQuery({
        queryKey: ['loginActivity'],
        queryFn: async () => {
            const { data, error } = await api
                .from('login_activity')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;
            return data as LoginActivity[];
        },
        enabled: isOpen,
    });

    const getDeviceIcon = (userAgent: string | null) => {
        if (!userAgent) return <Globe className="h-5 w-5 text-gray-400" />;
        if (userAgent.toLowerCase().includes('mobile')) return <Smartphone className="h-5 w-5 text-blue-500" />;
        return <Laptop className="h-5 w-5 text-gray-500" />;
    };

    const getDeviceName = (userAgent: string | null) => {
        if (!userAgent) return 'Unknown Device';
        if (userAgent.includes('Windows')) return 'Windows PC';
        if (userAgent.includes('Mac')) return 'Mac';
        if (userAgent.includes('iPhone')) return 'iPhone';
        if (userAgent.includes('Android')) return 'Android';
        return 'Web Browser';
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] bg-white">
                <DialogHeader>
                    <DialogTitle>Recent Login Activity</DialogTitle>
                </DialogHeader>

                <ScrollArea className="h-[400px] pr-4">
                    {isLoading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                                    <Skeleton className="h-10 w-10 rounded-full" />
                                    <div className="space-y-2 flex-1">
                                        <Skeleton className="h-4 w-1/3" />
                                        <Skeleton className="h-3 w-1/2" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : activities?.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            No login activity recorded yet.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {activities?.map((activity) => (
                                <div key={activity.id} className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                                    <div className="p-2 bg-gray-100 rounded-full">
                                        {getDeviceIcon(activity.user_agent)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-medium text-sm">{getDeviceName(activity.user_agent)}</h4>
                                            <span className="text-xs text-gray-500">
                                                {format(new Date(activity.created_at), 'MMM d, h:mm a')}
                                            </span>
                                        </div>
                                        <div className="mt-1 space-y-1">
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <Globe size={12} />
                                                <span>IP: {activity.ip_address || 'Unknown'}</span>
                                            </div>
                                            {activity.location && (
                                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                                    <MapPin size={12} />
                                                    <span>{activity.location}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
};
