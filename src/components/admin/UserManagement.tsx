/**
 * User Management
 *
 * Admin component for the AIfacilitator application.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
    Loader2,
    Search,
    UserX,
    UserCheck,
    Shield,
    Mail,
    Calendar,
    Ban,
    CheckCircle,
    Filter,
    Download,
    ArrowUpDown,
    MoreHorizontal
} from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";

interface Profile {
    id: string;
    email: string;
    role: 'admin' | 'free' | 'basic' | 'premium' | null;
    current_plan_id: number | null; // Changed from plan_id to current_plan_id
    created_at: string;
    banned: boolean | null;
    updated_at: string;
}

export const UserManagement = () => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");
    const [roleFilter, setRoleFilter] = useState<string>("all");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [sortBy, setSortBy] = useState<string>("created_at");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
    const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
    const [actionType, setActionType] = useState<'ban' | 'unban' | 'promote' | 'demote' | null>(null);

    // Fetch all users
    const { data: users, isLoading } = useQuery({
        queryKey: ['admin-users', searchTerm, roleFilter, statusFilter, sortBy, sortOrder],
        queryFn: async () => {
            let query = supabase
                .from('admin_profiles_view' as any) // Use the view to get emails
                .select(`
          id,
          email,
          role,
          plan_id,
          created_at,
          updated_at,
          banned
        `);

            // Apply filters
            if (searchTerm) {
                query = query.ilike('email', `%${searchTerm}%`);
            }

            if (roleFilter !== 'all') {
                if (roleFilter === 'admin') {
                    query = query.eq('role', 'admin');
                } else {
                    query = query.neq('role', 'admin'); // Simplified for now
                }
            }

            if (statusFilter !== 'all') {
                if (statusFilter === 'banned') {
                    query = query.eq('banned', true);
                } else if (statusFilter === 'active') {
                    query = query.eq('banned', false);
                }
            }

            // Apply sorting
            query = query.order(sortBy, { ascending: sortOrder === 'asc' });

            const { data, error } = await query;
            if (error) throw error;
            return (data as any[]) as Profile[];
        }
    });

    // Update user mutation
    const updateUserMutation = useMutation({
        mutationFn: async ({ userId, updates }: { userId: string; updates: Partial<Profile> }) => {
            const { error } = await supabase
                .from('profiles')
                .update(updates as any)
                .eq('id', userId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            toast({
                title: "Success",
                description: "User updated successfully",
            });
            setSelectedUser(null);
            setActionType(null);
        },
        onError: (error) => {
            toast({
                title: "Error",
                description: `Failed to update user: ${error.message}`,
                variant: "destructive",
            });
        }
    });

    const handleAction = (user: Profile, action: 'ban' | 'unban' | 'promote' | 'demote') => {
        setSelectedUser(user);
        setActionType(action);
    };

    const confirmAction = () => {
        if (!selectedUser || !actionType) return;

        const updates: Partial<Profile> = { /* no-op */ };

        switch (actionType) {
            case 'ban':
                updates.banned = true;
                break;
            case 'unban':
                updates.banned = false;
                break;
            case 'promote':
                updates.role = 'admin';
                break;
            case 'demote':
                updates.role = null;
                break;
        }

        updateUserMutation.mutate({ userId: selectedUser.id, updates });
    };

    const toggleSort = (column: string) => {
        if (sortBy === column) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column);
            setSortOrder('desc');
        }
    };

    const exportToCSV = () => {
        if (!users) return;

        const headers = ['ID', 'Email', 'Role', 'Status', 'Joined', 'Last Active'];
        const csvContent = [
            headers.join(','),
            ...users.map(user => [
                user.id,
                user.email,
                user.role || 'user',
                user.banned ? 'Banned' : 'Active',
                user.created_at,
                user.updated_at
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `users_export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

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
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Shield className="h-6 w-6 text-purple-600" />
                            <div>
                                <CardTitle className="text-2xl">User Management</CardTitle>
                                <CardDescription>
                                    Manage user accounts, roles, and permissions
                                </CardDescription>
                            </div>
                        </div>
                        <Button variant="outline" onClick={exportToCSV} className="hidden sm:flex">
                            <Download className="h-4 w-4 mr-2" />
                            Export CSV
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                    {/* Filters and Search */}
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Search by email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <div className="flex gap-2">
                            <Select value={roleFilter} onValueChange={setRoleFilter}>
                                <SelectTrigger className="w-[150px]">
                                    <div className="flex items-center gap-2">
                                        <Shield className="h-4 w-4 text-gray-500" />
                                        <SelectValue placeholder="Role" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Roles</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="user">User</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-[150px]">
                                    <div className="flex items-center gap-2">
                                        <Filter className="h-4 w-4 text-gray-500" />
                                        <SelectValue placeholder="Status" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="banned">Banned</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Users Table */}
                    <div className="border rounded-lg overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-gray-50">
                                    <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => toggleSort('email')}>
                                        <div className="flex items-center gap-1">
                                            Email
                                            <ArrowUpDown className="h-3 w-3" />
                                        </div>
                                    </TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => toggleSort('created_at')}>
                                        <div className="flex items-center gap-1">
                                            Joined
                                            <ArrowUpDown className="h-3 w-3" />
                                        </div>
                                    </TableHead>
                                    <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => toggleSort('updated_at')}>
                                        <div className="flex items-center gap-1">
                                            Last Active
                                            <ArrowUpDown className="h-3 w-3" />
                                        </div>
                                    </TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users?.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Mail className="h-4 w-4 text-gray-400" />
                                                <span className="font-medium">{user.email}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {user.role === 'admin' ? (
                                                <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-200">
                                                    <Shield className="h-3 w-3 mr-1" />
                                                    Admin
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline">User</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {user.banned ? (
                                                <Badge variant="destructive">
                                                    <Ban className="h-3 w-3 mr-1" />
                                                    Banned
                                                </Badge>
                                            ) : (
                                                <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                                                    <CheckCircle className="h-3 w-3 mr-1" />
                                                    Active
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <Calendar className="h-3 w-3" />
                                                {format(new Date(user.created_at), 'MMM d, yyyy')}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm text-gray-600">
                                                {format(new Date(user.updated_at), 'MMM d, yyyy')}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <span className="sr-only">Open menu</span>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => navigator.clipboard.writeText(user.email)}>
                                                        Copy Email
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    {user.role === 'admin' ? (
                                                        <DropdownMenuItem onClick={() => handleAction(user, 'demote')}>
                                                            Demote from Admin
                                                        </DropdownMenuItem>
                                                    ) : (
                                                        <DropdownMenuItem onClick={() => handleAction(user, 'promote')}>
                                                            Promote to Admin
                                                        </DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuSeparator />
                                                    {user.banned ? (
                                                        <DropdownMenuItem onClick={() => handleAction(user, 'unban')} className="text-green-600">
                                                            Unban User
                                                        </DropdownMenuItem>
                                                    ) : (
                                                        <DropdownMenuItem onClick={() => handleAction(user, 'ban')} className="text-red-600">
                                                            Ban User
                                                        </DropdownMenuItem>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    {users?.length === 0 && (
                        <div className="text-center py-12 text-gray-500">
                            No users found matching your filters
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Confirmation Dialog */}
            <AlertDialog open={!!actionType} onOpenChange={() => setActionType(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {actionType === 'ban' && 'Ban User'}
                            {actionType === 'unban' && 'Unban User'}
                            {actionType === 'promote' && 'Promote to Admin'}
                            {actionType === 'demote' && 'Demote from Admin'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {actionType === 'ban' && `Are you sure you want to ban ${selectedUser?.email}? They will no longer be able to access the platform.`}
                            {actionType === 'unban' && `Are you sure you want to unban ${selectedUser?.email}? They will regain access to the platform.`}
                            {actionType === 'promote' && `Are you sure you want to promote ${selectedUser?.email} to admin? They will have full platform access.`}
                            {actionType === 'demote' && `Are you sure you want to demote ${selectedUser?.email} from admin? They will lose admin privileges.`}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmAction}
                            className={
                                actionType === 'ban'
                                    ? 'bg-red-600 hover:bg-red-700'
                                    : 'bg-purple-600 hover:bg-purple-700'
                            }
                        >
                            Confirm
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};
