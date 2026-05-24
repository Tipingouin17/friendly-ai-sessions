/**
 * AuthContext
 *
 * Provides authentication state and actions to the entire application.
 * Uses the Railway API client (via the \ shim) for all auth operations.
 * Exposed via the \ hook — must be consumed inside <AuthProvider>.
 */

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { ApiUser, ApiSession } from '@/lib/api';
import api from "@/lib/api";
import { useSecurityAudit } from '@/hooks/useSecurityAudit';

interface AuthContextType {
  user: ApiUser | null;
  session: ApiSession | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [session, setSession] = useState<ApiSession | null>(null);
  const [loading, setLoading] = useState(true);
  const { logAuthAttempt, logSecurityViolation } = useSecurityAudit();

  // Use refs to hold the latest callbacks so the auth useEffect never needs
  // to re-run just because a logging function reference changed.  This prevents
  // an infinite loading loop where re-rendering AuthProvider caused a new
  // logAuthAttempt reference, which triggered the useEffect again and reset
  // loading back to true before getUser() could complete.
  const logAuthAttemptRef = useRef(logAuthAttempt);
  const logSecurityViolationRef = useRef(logSecurityViolation);
  useEffect(() => { logAuthAttemptRef.current = logAuthAttempt; }, [logAuthAttempt]);
  useEffect(() => { logSecurityViolationRef.current = logSecurityViolation; }, [logSecurityViolation]);

  // Track whether the initial getSession() call has completed.
  // onAuthStateChange must NOT call setLoading(false) until after that point
  // to avoid the race condition where INITIAL_SESSION fires with session=null
  // before getSession() has had a chance to restore the persisted session.
  const initializedRef = useRef(false);

  useEffect(() => {
    // Set up auth state listener FIRST.
    // IMPORTANT: Do NOT call setLoading(false) here — only getSession() controls
    // the loading flag during startup.  onAuthStateChange handles post-init events
    // (SIGNED_IN after login, SIGNED_OUT after logout, TOKEN_REFRESHED).
    const { data: { subscription } } = api.auth.onAuthStateChange(
      (event, newSession) => {
        // Only update state for post-initialization events.
        // During startup, getSession() is the single source of truth.
        if (!initializedRef.current) return;

        setSession(newSession);
        setUser(newSession?.user ?? null);

        // Log authentication events
        if (event === 'SIGNED_IN') {
          logAuthAttemptRef.current(true, 'email');
        }
      }
    );

    // THEN check for existing session — this is the authoritative startup path.
    api.auth.getSession().then(async ({ data: { session: existingSession } }) => {
      setSession(existingSession);
      if (existingSession?.user) {
        // Fetch fresh user data from backend so role is always current
        // (cached session may have stale role from before backend fixes)
        // Use a 5-second timeout so a slow backend cold-start doesn't block
        // the UI indefinitely on "Verifying access...".
        try {
          const getUserWithTimeout = Promise.race([
            api.auth.getUser(),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('getUser timeout')), 5000)
            ),
          ]) as Promise<{ data: { user: import('@/lib/api').ApiUser | null } }>;
          const { data: { user: freshUser } } = await getUserWithTimeout;
          setUser(freshUser ?? existingSession.user);
        } catch {
          // Backend slow or unreachable — fall back to cached session user
          setUser(existingSession.user);
        }
      } else {
        setUser(null);
      }
      // Mark initialization complete BEFORE setLoading(false) so that any
      // onAuthStateChange events queued during startup are processed correctly
      // from this point forward.
      initializedRef.current = true;
      setLoading(false);
    });

    return () => subscription.unsubscribe();
    // Empty dependency array: this effect runs only once on mount.
    // Logging callbacks are accessed via refs so they are always current
    // without causing the effect to re-run.

  }, []);

  const login = async (email: string, password: string) => {
    try {
      // Input validation
      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error('Invalid email format');
      }

      const { error } = await api.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        logAuthAttempt(false, 'email');
        throw error;
      }
    } catch (error) {
      logAuthAttempt(false, 'email');
      throw error;
    }
  };

  const signup = async (email: string, password: string, name: string) => {
    try {
      // Input validation
      if (!email || !password || !name) {
        throw new Error('All fields are required');
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error('Invalid email format');
      }

      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters long');
      }

      const { error } = await api.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          // Send the display name so the backend can store it in profiles.full_name.
          // The backend accepts both 'name' and 'full_name' inside options.data.
          data: { name: name.trim() },
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });

      if (error) {
        logAuthAttempt(false, 'signup');
        throw error;
      }
      // Log the successful signup attempt
      logAuthAttempt(true, 'signup');
    } catch (error) {
      logAuthAttempt(false, 'signup');
      throw error;
    }
  };

  const logout = async () => {
    try {
      const { error } = await api.auth.signOut();
      if (error) throw error;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Logout failed';
      logSecurityViolation('logout_failed', { error: msg });
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error('Valid email is required');
      }

      const { error } = await api.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/reset-password`
      });
      if (error) throw error;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Reset failed';
      logSecurityViolation('password_reset_failed', { error: msg });
      throw error;
    }
  };

  const refreshUser = async () => {
    try {
      const { data: { user: freshUser } } = await api.auth.getUser();
      if (freshUser) setUser(freshUser);
    } catch { /* non-fatal */ }
  };

  const value = {
    user,
    session,
    loading,
    isAuthenticated: !!user && !!session,
    login,
    signup,
    logout,
    resetPassword,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
