
import { createContext, useContext, ReactNode } from 'react';
import { User, AuthContextType } from '@/types/auth';

const mockUser: User = {
  id: '1',
  email: 'demo@example.com',
  name: 'Demo User',
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // Mock functions that do nothing since we're always "logged in"
  const login = () => {};
  const signup = () => {};
  const logout = () => {};

  return (
    <AuthContext.Provider value={{ 
      user: mockUser, 
      login, 
      signup, 
      logout, 
      isAuthenticated: true 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
