
import { Database } from "@/integrations/supabase/types";

export type UserRole = Database["public"]["Enums"]["user_role"];

export interface User {
  id: string;
  email: string;
  name?: string;
  role?: UserRole;
  plan?: {
    id: number;
    title: string;
    plan_type: string;
    price: number;
  };
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  canUseFeature: (feature: string) => boolean;
}
