/**
 * Protected Route
 *
 * Component for the AIfacilitator application.
 */

import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { clearJoinToken, clearParticipantSessionData } from '@/lib/api';
import { Loader2 } from 'lucide-react';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Always clear stale participant session data when entering any protected
  // (host-only) route. This prevents the "Something went wrong" crash that
  // occurs when a host tests the participant flow in the same browser and
  // then navigates back to a host page while participantSessionData / mf_join_token
  // are still present in localStorage.
  useEffect(() => {
    clearJoinToken();
    clearParticipantSessionData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />;
  }

  return <>{children}</>;
};
