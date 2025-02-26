
export type UserRole = 'free' | 'basic' | 'premium' | 'admin';

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

export interface FeatureRestrictions {
  max_participants: number;
  can_save_sessions: boolean;
  can_export_data: boolean;
  max_facilitators: number;
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  canUseFeature: (feature: keyof FeatureRestrictions) => boolean;
}
