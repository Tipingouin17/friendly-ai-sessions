import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { api, type ActivationState } from '@/lib/api';

type GuardStatus = 'loading' | 'allow' | 'redirect';

const ACTIVATION_COMPLETE_STATUSES = new Set(['first_session_created', 'activated']);
const ACTIVATION_BYPASS_STORAGE_KEY = 'aifacilitator_activation_route_bypass_v1';

function isActivationComplete(state: ActivationState | null): boolean {
  if (!state) return false;
  return Boolean(
    state.activated_at ||
      state.first_session_created_at ||
      state.first_session_id ||
      ACTIVATION_COMPLETE_STATUSES.has(state.activation_status),
  );
}

function hasUserBypassedActivation(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(ACTIVATION_BYPASS_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function markActivationRouteBypassed(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(ACTIVATION_BYPASS_STORAGE_KEY, 'true');
  } catch {
    // Ignore storage failures. The guard is advisory and should not break navigation.
  }
}

export const ActivationRouteGuard = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const [status, setStatus] = useState<GuardStatus>('loading');

  useEffect(() => {
    let active = true;

    const checkActivation = async () => {
      if (hasUserBypassedActivation()) {
        if (active) setStatus('allow');
        return;
      }

      const { data, error } = await api.activation.getState();
      if (!active) return;

      if (error) {
        // Fail open: activation guidance must never block paying or returning users.
        setStatus('allow');
        return;
      }

      setStatus(isActivationComplete(data) ? 'allow' : 'redirect');
    };

    void checkActivation();

    return () => {
      active = false;
    };
  }, [location.pathname, location.search]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
        <p className="text-sm text-gray-500">Preparing your workspace…</p>
      </div>
    );
  }

  if (status === 'redirect') {
    return <Navigate to="/activation" state={{ from: location.pathname + location.search }} replace />;
  }

  return <>{children}</>;
};
