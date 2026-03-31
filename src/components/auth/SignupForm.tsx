
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { signupSchema, sanitizeInput } from '@/utils/inputValidation';
import { SignupFormFields } from './SignupFormFields';

// Define validation schema
const signupFormSchema = signupSchema.extend({
  confirmPassword: z.string().min(8, "Password confirmation must be at least 8 characters")
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const SignupForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({ /* no-op */ });
  const [attempts, setAttempts] = useState(0);
  
  const { signup } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const validateForm = () => {
    try {
      signupFormSchema.parse({ 
        name: sanitizeInput(name), 
        email: sanitizeInput(email), 
        password, 
        confirmPassword 
      });
      setErrors({ /* no-op */ });
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = { /* no-op */ };
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
    
    // Rate limiting - max 3 attempts per 5 minutes
    if (attempts >= 3) {
      toast({
        title: "Too many attempts",
        description: "Please wait 5 minutes before trying again.",
        variant: "destructive"
      });
      return;
    }
    
    // Validate inputs
    if (!validateForm()) {
      setAttempts(prev => prev + 1);
      return;
    }
    
    setIsLoading(true);
    try {
      await signup(sanitizeInput(email), password, sanitizeInput(name));
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
      setAttempts(prev => prev + 1);
      toast({
        title: "Signup failed",
        description: error.message || "An error occurred during signup",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Reset attempts after 5 minutes
  useEffect(() => {
    if (attempts > 0) {
      const timer = setTimeout(() => setAttempts(0), 5 * 60 * 1000);
      return () => clearTimeout(timer);
    }
  }, [attempts]);

  return (
    <form onSubmit={handleSubmit}>
      <SignupFormFields
        name={name}
        email={email}
        password={password}
        confirmPassword={confirmPassword}
        isLoading={isLoading}
        attempts={attempts}
        errors={errors}
        onNameChange={setName}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onConfirmPasswordChange={setConfirmPassword}
      />
    </form>
  );
};
