/**
 * Signup Form
 *
 * Auth component for the AIfacilitator application.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { signupSchema, sanitizeInput, normalizePersonName } from '@/utils/inputValidation';
import { SignupFormFields } from './SignupFormFields';
import { recordActivationEventBeacon } from '@/lib/activationTracking';
import { trackActivationSignupSubmitted, trackSignup, trackSignupStart } from '@/lib/tracking';

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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  
  const { signup } = useAuth();
  const navigate = useNavigate();

  const validateForm = () => {
    try {
      signupFormSchema.parse({ 
        name: normalizePersonName(name), 
        email: sanitizeInput(email).toLowerCase(), 
        password, 
        confirmPassword 
      });
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
    setServerError(null);
    
    // Rate limiting - max 3 attempts per 5 minutes
    if (attempts >= 3) {
      toast.error("Too many attempts. Please wait 5 minutes before trying again.");
      return;
    }
    
    // Validate inputs
    if (!validateForm()) {
      setAttempts(prev => prev + 1);
      return;
    }
    
    const sanitizedEmail = sanitizeInput(email).toLowerCase();
    const sanitizedName = normalizePersonName(name);

    setIsLoading(true);
    recordActivationEventBeacon('activation_signup_started', {
      activation_step: 'signup_started',
      method: 'email',
      form: 'signup',
    });
    trackSignupStart('email');
    try {
      await signup(sanitizedEmail, password, sanitizedName);
      recordActivationEventBeacon('activation_signup_submitted', {
        activation_step: 'signup_submitted',
        method: 'email',
        form: 'signup',
      });
      trackSignup('email', { email: sanitizedEmail });
      trackActivationSignupSubmitted('email');
      // The backend now requires email verification before login.
      // Redirect to a confirmation page instead of the dashboard.
      toast.success("Account created! Please check your email to verify your account.");
      navigate('/verify-email-sent', { replace: true, state: { email: sanitizedEmail } });
    } catch (error: unknown) {
      setAttempts(prev => prev + 1);
      // Handle both Error instances and Supabase/API error objects with a message property
      const rawMessage =
        error instanceof Error
          ? error.message
          : (error as { message?: string })?.message ?? "An error occurred during signup";

      // Map backend error codes to user-friendly messages
      let friendlyMessage = "Signup failed. Please try again, or contact support if the problem persists.";
      if (
        rawMessage.toLowerCase().includes('user_already_exists') ||
        rawMessage.toLowerCase().includes('already registered') ||
        rawMessage.toLowerCase().includes('already exists')
      ) {
        friendlyMessage = "An account with this email already exists. Please log in instead.";
      } else if (rawMessage.toLowerCase().includes('weak_password')) {
        friendlyMessage = "Password is too weak. Use at least 8 characters with uppercase, lowercase, number, and special character.";
      } else if (rawMessage.toLowerCase().includes('invalid_email') || rawMessage.toLowerCase().includes('invalid email')) {
        friendlyMessage = "Please enter a valid email address.";
      }

      // Show both inline (reliable) and toast (visible if Sonner is mounted)
      setServerError(friendlyMessage);
      toast.error(friendlyMessage);
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
        serverError={serverError}
        onNameChange={setName}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onConfirmPasswordChange={setConfirmPassword}
      />
    </form>
  );
};
