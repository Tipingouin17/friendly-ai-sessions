/**
 * Protected Admin Route
 *
 * Component for the AIfacilitator application.
 */
import { ReactNode, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import { Loader2 } from "lucide-react";

interface ProtectedAdminRouteProps {
    children: ReactNode;
}

export const ProtectedAdminRoute = ({ children }: ProtectedAdminRouteProps) => {
    const { user, loading } = useAuth();
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        const checkAdminStatus = async () => {
            if (!user) {
                setIsAdmin(false);
                setChecking(false);
                return;
            }

            try {
                // Check if user has admin role
                const { data, error } = await api
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();

                if (error) {
                    console.error('ProtectedAdminRoute: Error checking admin status:', error);
                    setIsAdmin(false);
                } else {
                    const isUserAdmin = data?.role === 'admin';
                    setIsAdmin(isUserAdmin);
                }
            } catch (error) {
                console.error('ProtectedAdminRoute: Exception checking admin status:', error);
                setIsAdmin(false);
            } finally {
                setChecking(false);
            }
        };

        if (!loading) {
            checkAdminStatus();
        }
    }, [user?.id, loading]); // Use user.id to prevent re-runs on object reference change

    if (loading || checking) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-4" />
                    <p className="text-gray-600">Verifying admin access...</p>
                </div>
            </div>
        );
    }

    if (!user || !isAdmin) {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
};
