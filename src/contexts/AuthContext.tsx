
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useSecurityAudit } from '@/hooks/useSecurityAudit';

interface AuthContextType {
  user: User | null;
  session: Session | null;
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
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
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
        } else if (event === 'SIGNED_OUT') {
          // Clear any sensitive data on logout
          localStorage.removeItem('supabase.auth.token');
          sessionStorage.clear();
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
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
          data: {
            name: name.trim(),
          },
          emailRedirectTo: `${window.location.origin}/login`
        },
      });

      if (error) {
        logAuthAttempt(false, 'signup');
        throw error;
      }
    } catch (error) {
      logAuthAttempt(false, 'signup');
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Clear sensitive data before logout
      const keysToRemove = Object.keys(localStorage).filter(key =>
        key.includes('session') || key.includes('participant') || key.includes('auth')
      );
      keysToRemove.forEach(key => localStorage.removeItem(key));
      sessionStorage.clear();

      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      logSecurityViolation('logout_failed', { error: error.message });
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
    } catch (error) {
      logSecurityViolation('password_reset_failed', { error: error.message });
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
