/**
 * AuthContext
 *
 * Provides authentication state and actions to the entire application.
 * Uses the Railway API client (via the \ shim) for all auth operations.
 * Exposed via the \ hook — must be consumed inside <AuthProvider>.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { ApiUser, ApiSession } from '@/lib/api';
import { supabase } from '@/integrations/supabase/client';
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

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setLoading(false);

        // Log authentication events
        if (event === 'SIGNED_IN') {
          logAuthAttempt(true, 'email');
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session: existingSession } }) => {
      setSession(existingSession);
      if (existingSession?.user) {
        // Fetch fresh user data from backend so role is always current
        // (cached session may have stale role from before backend fixes)
        try {
          const { data: { user: freshUser } } = await supabase.auth.getUser();
          setUser(freshUser ?? existingSession.user);
        } catch {
          setUser(existingSession.user);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [logAuthAttempt]);

  const login = async (email: string, password: string) => {
    try {
      // Input validation
      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error('Invalid email format');
      }

      const { error } = await supabase.auth.signInWithPassword({
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

      const { error } = await supabase.auth.signUp({
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
      const { error } = await supabase.auth.signOut();
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

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/reset-password`
      });
      if (error) throw error;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Reset failed';
      logSecurityViolation('password_reset_failed', { error: msg });
      throw error;
    }
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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
