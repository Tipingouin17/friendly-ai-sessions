/**
 * Protected Route
 *
 * Component for the AIfacilitator application.
 */

import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { api, clearAllParticipantState } from '@/lib/api';
import { Loader2 } from 'lucide-react';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  const [sessionRecoveryChecked, setSessionRecoveryChecked] = useState(false);
  const [recoveringSession, setRecoveringSession] = useState(false);

  // Clear ALL participant state (join tokens + session data for every session)
  // whenever an authenticated host navigates to a protected route.
  //
  // Because tokens are now session-scoped (mf_join_token_{id}), this sweep
  // removes tokens for every session the host may have tested as a participant,
  // with zero risk of removing the host's own auth token (mf_session).
  useEffect(() => {
    clearAllParticipantState();
  }, []);

  useEffect(() => {
    if (loading || isAuthenticated || sessionRecoveryChecked) return;

    let active = true;
    setRecoveringSession(true);

    api.auth.getSession()
      .then(({ data: { session } }) => {
        if (!active) return;
        if (session?.access_token) {
          void api.auth.acceptVerifiedSession(session);
        }
      })
      .finally(() => {
        if (!active) return;
        setSessionRecoveryChecked(true);
        setRecoveringSession(false);
      });

    return () => {
      active = false;
    };
  }, [isAuthenticated, loading, sessionRecoveryChecked]);

  if (loading || recoveringSession || (!isAuthenticated && !sessionRecoveryChecked)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated && sessionRecoveryChecked) {
    return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />;
  }

  return <>{children}</>;
};
