/**
 * auth
 *
 * Type definitions for the AIfacilitator application.
 */

export interface User {
  id: string;
  email: string;
  name?: string;
  user_metadata?: {
    name?: string;
  };
  raw_user_meta_data?: {
    name?: string;
  };
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  isAuthenticated: boolean;
  loading: boolean;
}
