
import { createContext, useContext, useState, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/components/ui/use-toast';
import { User, AuthContextType } from '@/types/auth';

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  const login = (email: string, password: string) => {
    // This is a mock authentication - in a real app, you'd validate against a backend
    if (email && password) {
      setUser({
        id: '1',
        email,
        name: email.split('@')[0],
      });
      toast({
        title: "Welcome back!",
        description: "You have successfully logged in.",
      });
      navigate('/my-facilitators');
    }
  };

  const signup = (email: string, password: string, name: string) => {
    // This is a mock signup - in a real app, you'd create a user in your backend
    if (email && password && name) {
      setUser({
        id: '1',
        email,
        name,
      });
      toast({
        title: "Welcome!",
        description: "Your account has been created successfully.",
      });
      navigate('/my-facilitators');
    }
  };

  const logout = () => {
    setUser(null);
    toast({
      title: "Logged out",
      description: "You have been logged out successfully.",
    });
    navigate('/');
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, isAuthenticated: !!user }}>
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
