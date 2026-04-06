/**
 * User Management — Admin Component
 * Full CRUD: view, search, filter, sort, change plan, ban/unban, promote/demote, export CSV
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
    DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
    Users, Search, Download, MoreHorizontal, ArrowUpDown, ArrowUp, ArrowDown,
    Shield, ShieldOff, Ban, CheckCircle, Mail, Calendar, CreditCard,
    Activity, ChevronLeft, ChevronRight, RefreshCw, UserCheck, UserX,
    Loader2,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface Profile {
    id: string;
    email: string;
    role: string | null;
    plan_id: number | null;
    current_plan_id: number | null;
    created_at: string;
    updated_at: string;
    banned: boolean | null;
    subscription_status: string | null;
    stripe_customer_id: string | null;
}

interface Plan {
    id: number;
    title: string;
    price: number | null;
}

const PAGE_SIZE = 20;

const roleBadge = (role: string | null) => {
    if (role === "admin") return <Badge className="bg-purple-100 text-purple-800 border border-purple-200 hover:bg-purple-100">Admin</Badge>;
    return <Badge variant="outline" className="text-gray-600">Host</Badge>;
};

const statusBadge = (banned: boolean | null, sub?: string | null) => {
    if (banned) return <Badge variant="destructive">Banned</Badge>;
    if (sub === "active") return <Badge className="bg-green-100 text-green-800 border border-green-200 hover:bg-green-100">Active</Badge>;
    if (sub === "canceled") return <Badge className="bg-orange-100 text-orange-800 border border-orange-200 hover:bg-orange-100">Cancelled</Badge>;
    return <Badge variant="outline" className="text-gray-500">Free</Badge>;
};

export const UserManagement = () => {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [searchTerm, setSearchTerm] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [sortBy, setSortBy] = useState("created_at");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
    const [page, setPage] = useState(0);

    const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
    const [actionType, setActionType] = useState<"ban" | "unban" | "promote" | "demote" | null>(null);
    const [drawerUser, setDrawerUser] = useState<Profile | null>(null);
    const [newPlanId, setNewPlanId] = useState<string>("");

    const { data: plans } = useQuery({
        queryKey: ["admin-plans-list"],
        queryFn: async () => {
            const { data, error } = await supabase.from("plans").select("id, title, price").order("price", { ascending: true });
            if (error) throw error;
            return data as Plan[];
        },
    });

    const { data: users, isLoading, refetch } = useQuery({
        queryKey: ["admin-users", searchTerm, roleFilter, statusFilter, sortBy, sortOrder, page],
        queryFn: async () => {
            let query = supabase
                .from("profiles" as any)
                .select("id, email, role, plan_id, current_plan_id, created_at, updated_at, banned, subscription_status");

            if (searchTerm) query = query.ilike("email", `%${searchTerm}%`);
            if (roleFilter === "admin") query = query.eq("role", "admin");
            if (roleFilter === "host") query = query.neq("role", "admin");
            if (statusFilter === "banned") query = query.eq("banned", true);
            if (statusFilter === "active") query = query.eq("banned", false);

            query = query.order(sortBy, { ascending: sortOrder === "asc" });
            query = query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

            const { data, error } = await query;
            if (error) throw error;
            return (data as any[]) as Profile[];
        },
    });

    const { data: drawerProfile } = useQuery({
        queryKey: ["admin-user-detail", drawerUser?.id],
        enabled: !!drawerUser?.id,
        queryFn: async () => {
            const { data, error } = await supabase
                .from("profiles")
                .select("id, role, current_plan_id, created_at, updated_at, subscription_status, stripe_customer_id, banned")
                .eq("id", drawerUser!.id)
                .single();
            if (error) throw error;
            return data as Profile;
        },
    });

    const { data: userSessionCount } = useQuery({
        queryKey: ["admin-user-sessions", drawerUser?.id],
        enabled: !!drawerUser?.id,
        queryFn: async () => {
            const { count } = await supabase
                .from("conversations")
                .select("*", { count: "exact", head: true })
                .eq("user_id", drawerUser!.id);
            return count ?? 0;
        },
    });

    const updateUserMutation = useMutation({
        mutationFn: async ({ userId, updates }: { userId: string; updates: Record<string, unknown> }) => {
            const { error } = await supabase.from("profiles").update(updates).eq("id", userId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-users"] });
            queryClient.invalidateQueries({ queryKey: ["admin-user-detail"] });
            toast({ title: "User updated", description: "Changes saved successfully." });
            setSelectedUser(null);
            setActionType(null);
            setDrawerUser(null);
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    const confirmAction = () => {
        if (!selectedUser || !actionType) return;
        const updates: Record<string, unknown> = {};
        if (actionType === "ban") updates.banned = true;
        if (actionType === "unban") updates.banned = false;
        if (actionType === "promote") updates.role = "admin";
        if (actionType === "demote") updates.role = null;
        updateUserMutation.mutate({ userId: selectedUser.id, updates });
    };

    const toggleSort = (col: string) => {
        if (sortBy === col) setSortOrder(sortOrder === "asc" ? "desc" : "asc");
        else { setSortBy(col); setSortOrder("desc"); }
        setPage(0);
    };

    const SortIcon = ({ col }: { col: string }) => {
        if (sortBy !== col) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
        return sortOrder === "asc"
            ? <ArrowUp className="h-3 w-3 ml-1 text-purple-600" />
            : <ArrowDown className="h-3 w-3 ml-1 text-purple-600" />;
    };

    const exportCSV = () => {
        if (!users) return;
        const headers = ["ID", "Email", "Role", "Plan ID", "Status", "Joined", "Last Active"];
        const rows = users.map(u => [
            u.id, u.email, u.role ?? "host", u.plan_id ?? "",
            u.banned ? "banned" : "active",
            format(new Date(u.created_at), "yyyy-MM-dd"),
            format(new Date(u.updated_at), "yyyy-MM-dd"),
        ]);
        const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = `users-${format(new Date(), "yyyy-MM-dd")}.csv`; a.click();
        URL.revokeObjectURL(url);
    };

    const planName = (planId: number | null) => plans?.find(p => p.id === planId)?.title ?? "—";

    return (
        <div className="space-y-6">
            <Card className="border-purple-200 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-t-lg">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 rounded-lg">
                                <Users className="h-6 w-6 text-purple-600" />
                            </div>
                            <div>
                                <CardTitle className="text-xl">User Management</CardTitle>
                                <CardDescription>View, manage, and act on all platform users</CardDescription>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => refetch()}>
                                <RefreshCw className="h-4 w-4 mr-1" /> Refresh
                            </Button>
                            <Button variant="outline" size="sm" onClick={exportCSV}>
                                <Download className="h-4 w-4 mr-1" /> Export CSV
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="pt-5 space-y-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Search by email..."
                                value={searchTerm}
                                onChange={e => { setSearchTerm(e.target.value); setPage(0); }}
                                className="pl-9"
                            />
                        </div>
                        <Select value={roleFilter} onValueChange={v => { setRoleFilter(v); setPage(0); }}>
                            <SelectTrigger className="w-full sm:w-40">
                                <SelectValue placeholder="Role" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Roles</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="host">Host</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(0); }}>
                            <SelectTrigger className="w-full sm:w-40">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="banned">Banned</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {isLoading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                        </div>
                    ) : (
                        <div className="rounded-xl border overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-gray-50">
                                        <TableHead>
                                            <button className="flex items-center font-semibold text-gray-700 hover:text-purple-700" onClick={() => toggleSort("email")}>
                                                Email <SortIcon col="email" />
                                            </button>
                                        </TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>Plan</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>
                                            <button className="flex items-center font-semibold text-gray-700 hover:text-purple-700" onClick={() => toggleSort("created_at")}>
                                                Joined <SortIcon col="created_at" />
                                            </button>
                                        </TableHead>
                                        <TableHead>
                                            <button className="flex items-center font-semibold text-gray-700 hover:text-purple-700" onClick={() => toggleSort("updated_at")}>
                                                Last Active <SortIcon col="updated_at" />
                                            </button>
                                        </TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users?.map(user => (
                                        <TableRow key={user.id} className="hover:bg-purple-50/30 transition-colors">
                                            <TableCell>
                                                <button
                                                    className="text-left font-medium text-gray-900 hover:text-purple-700 transition-colors"
                                                    onClick={() => setDrawerUser(user)}
                                                >
                                                    {user.email}
                                                </button>
                                            </TableCell>
                                            <TableCell>{roleBadge(user.role)}</TableCell>
                                            <TableCell>
                                                <span className="text-sm text-gray-600">{planName(user.plan_id)}</span>
                                            </TableCell>
                                            <TableCell>{statusBadge(user.banned)}</TableCell>
                                            <TableCell className="text-sm text-gray-500">
                                                {format(new Date(user.created_at), "MMM d, yyyy")}
                                            </TableCell>
                                            <TableCell className="text-sm text-gray-500">
                                                {formatDistanceToNow(new Date(user.updated_at), { addSuffix: true })}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-48">
                                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                        <DropdownMenuItem onClick={() => setDrawerUser(user)}>
                                                            <UserCheck className="h-4 w-4 mr-2" /> View Details
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => navigator.clipboard.writeText(user.email)}>
                                                            <Mail className="h-4 w-4 mr-2" /> Copy Email
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        {user.role === "admin" ? (
                                                            <DropdownMenuItem onClick={() => { setSelectedUser(user); setActionType("demote"); }}>
                                                                <ShieldOff className="h-4 w-4 mr-2" /> Demote from Admin
                                                            </DropdownMenuItem>
                                                        ) : (
                                                            <DropdownMenuItem onClick={() => { setSelectedUser(user); setActionType("promote"); }}>
                                                                <Shield className="h-4 w-4 mr-2" /> Promote to Admin
                                                            </DropdownMenuItem>
                                                        )}
                                                        <DropdownMenuSeparator />
                                                        {user.banned ? (
                                                            <DropdownMenuItem onClick={() => { setSelectedUser(user); setActionType("unban"); }} className="text-green-600">
                                                                <CheckCircle className="h-4 w-4 mr-2" /> Unban User
                                                            </DropdownMenuItem>
                                                        ) : (
                                                            <DropdownMenuItem onClick={() => { setSelectedUser(user); setActionType("ban"); }} className="text-red-600">
                                                                <Ban className="h-4 w-4 mr-2" /> Ban User
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
                    )}

                    {users?.length === 0 && !isLoading && (
                        <div className="text-center py-16 text-gray-500">
                            <UserX className="h-12 w-12 mx-auto mb-3 opacity-30" />
                            <p className="font-medium">No users found</p>
                            <p className="text-sm">Try adjusting your filters</p>
                        </div>
                    )}

                    <div className="flex items-center justify-between pt-2">
                        <p className="text-sm text-gray-500">
                            Page {page + 1} · {users?.length ?? 0} results
                        </p>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" disabled={(users?.length ?? 0) < PAGE_SIZE} onClick={() => setPage(p => p + 1)}>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* User Detail Drawer */}
            <Sheet open={!!drawerUser} onOpenChange={open => !open && setDrawerUser(null)}>
                <SheetContent className="w-full sm:max-w-md overflow-y-auto">
                    <SheetHeader className="mb-6">
                        <SheetTitle className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white font-bold text-lg shrink-0">
                                {drawerUser?.email?.[0]?.toUpperCase() ?? "?"}
                            </div>
                            <div className="min-w-0">
                                <p className="font-semibold text-gray-900 truncate">{drawerUser?.email}</p>
                                <p className="text-sm text-gray-500 font-normal">User Profile</p>
                            </div>
                        </SheetTitle>
                        <SheetDescription>Full account details and quick actions</SheetDescription>
                    </SheetHeader>

                    <div className="space-y-5">
                        <div className="flex flex-wrap gap-2">
                            {roleBadge(drawerUser?.role ?? null)}
                            {statusBadge(drawerUser?.banned ?? null, drawerProfile?.subscription_status ?? null)}
                        </div>

                        <Separator />

                        <div className="space-y-4 text-sm">
                            <div className="flex items-start gap-3">
                                <Mail className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-gray-500 text-xs mb-0.5">Email</p>
                                    <p className="font-medium break-all">{drawerUser?.email}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Calendar className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-gray-500 text-xs mb-0.5">Joined</p>
                                    <p className="font-medium">
                                        {drawerUser?.created_at ? format(new Date(drawerUser.created_at), "MMMM d, yyyy") : "—"}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <CreditCard className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-gray-500 text-xs mb-0.5">Current Plan</p>
                                    <p className="font-medium">{planName(drawerUser?.plan_id ?? null)}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Activity className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-gray-500 text-xs mb-0.5">Sessions Hosted</p>
                                    <p className="font-medium">{userSessionCount ?? "—"}</p>
                                </div>
                            </div>
                            {drawerProfile?.stripe_customer_id && (
                                <div className="flex items-start gap-3">
                                    <CreditCard className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-gray-500 text-xs mb-0.5">Stripe Customer</p>
                                        <p className="font-mono text-xs text-gray-700 break-all">{drawerProfile.stripe_customer_id}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <Separator />

                        <div className="space-y-3">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Quick Actions</p>
                            <div className="grid grid-cols-2 gap-2">
                                {drawerUser?.role === "admin" ? (
                                    <Button variant="outline" size="sm" className="text-orange-600 border-orange-200 hover:bg-orange-50"
                                        onClick={() => { setSelectedUser(drawerUser); setActionType("demote"); setDrawerUser(null); }}>
                                        <ShieldOff className="h-4 w-4 mr-1" /> Demote
                                    </Button>
                                ) : (
                                    <Button variant="outline" size="sm" className="text-purple-600 border-purple-200 hover:bg-purple-50"
                                        onClick={() => { setSelectedUser(drawerUser); setActionType("promote"); setDrawerUser(null); }}>
                                        <Shield className="h-4 w-4 mr-1" /> Make Admin
                                    </Button>
                                )}
                                {drawerUser?.banned ? (
                                    <Button variant="outline" size="sm" className="text-green-600 border-green-200 hover:bg-green-50"
                                        onClick={() => { setSelectedUser(drawerUser); setActionType("unban"); setDrawerUser(null); }}>
                                        <CheckCircle className="h-4 w-4 mr-1" /> Unban
                                    </Button>
                                ) : (
                                    <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50"
                                        onClick={() => { setSelectedUser(drawerUser); setActionType("ban"); setDrawerUser(null); }}>
                                        <Ban className="h-4 w-4 mr-1" /> Ban
                                    </Button>
                                )}
                            </div>

                            <div className="space-y-2 pt-1">
                                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Assign Plan</Label>
                                <div className="flex gap-2">
                                    <Select
                                        value={newPlanId || String(drawerUser?.plan_id ?? "")}
                                        onValueChange={setNewPlanId}
                                    >
                                        <SelectTrigger className="flex-1">
                                            <SelectValue placeholder="Select plan" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {plans?.map(p => (
                                                <SelectItem key={p.id} value={String(p.id)}>
                                                    {p.title}{p.price ? ` — $${p.price}/mo` : " (Free)"}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Button
                                        size="sm"
                                        className="bg-purple-600 hover:bg-purple-700"
                                        disabled={!newPlanId || updateUserMutation.isPending}
                                        onClick={() => {
                                            if (!drawerUser || !newPlanId) return;
                                            updateUserMutation.mutate({
                                                userId: drawerUser.id,
                                                updates: { current_plan_id: parseInt(newPlanId) },
                                            });
                                        }}
                                    >
                                        {updateUserMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>

            {/* Confirm Action Dialog */}
            <AlertDialog open={!!actionType} onOpenChange={open => !open && setActionType(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {actionType === "ban" && "Ban User"}
                            {actionType === "unban" && "Unban User"}
                            {actionType === "promote" && "Promote to Admin"}
                            {actionType === "demote" && "Demote from Admin"}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {actionType === "ban" && `Ban ${selectedUser?.email}? They will lose platform access immediately.`}
                            {actionType === "unban" && `Unban ${selectedUser?.email}? They will regain full platform access.`}
                            {actionType === "promote" && `Promote ${selectedUser?.email} to admin? They will gain full admin access.`}
                            {actionType === "demote" && `Demote ${selectedUser?.email} from admin? They will lose admin privileges.`}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmAction}
                            disabled={updateUserMutation.isPending}
                            className={actionType === "ban" ? "bg-red-600 hover:bg-red-700" : "bg-purple-600 hover:bg-purple-700"}
                        >
                            {updateUserMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            Confirm
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};
