
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { z } from 'zod';

// Define validation schema
const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters")
});

const Signup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { signup } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const validateForm = () => {
    try {
      signupSchema.parse({ name, email, password });
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach(err => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate inputs
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    try {
      await signup(email, password, name);
      toast({
        title: "Account created",
        description: "Please check your email to verify your account."
      });
      navigate('/login', {
        state: {
          message: 'Please check your email to verify your account.'
        }
      });
    } catch (error: any) {
      console.error('Signup error:', error);
      toast({
        title: "Signup failed",
        description: error.message || "An error occurred during signup",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16 bg-[#FFC107]/10">
      <div className="max-w-md mx-auto px-4">
        <div className="bg-white rounded-3xl shadow-lg p-8">
          <h1 className="text-2xl font-bold text-center mb-6">Create an Account</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-2 text-left">
                Full Name
              </label>
              <Input 
                id="name" 
                type="text" 
                placeholder="Enter your full name" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                className={errors.name ? "border-red-500" : ""}
                aria-invalid={!!errors.name}
                required 
              />
              {errors.name && (
                <p className="text-red-500 text-xs mt-1">{errors.name}</p>
              )}
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2 text-left">
                Email
              </label>
              <Input 
                id="email" 
                type="email" 
                placeholder="Enter your email" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                className={errors.email ? "border-red-500" : ""}
                aria-invalid={!!errors.email}
                required 
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email}</p>
              )}
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2 text-left">
                Password
              </label>
              <Input 
                id="password" 
                type="password" 
                placeholder="Create a password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                className={errors.password ? "border-red-500" : ""}
                aria-invalid={!!errors.password}
                required 
              />
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">{errors.password}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Creating account...' : 'Sign up'}
            </Button>
          </form>
          <p className="text-center mt-4 text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
export default Signup;
