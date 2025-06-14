
import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface SignupFormFieldsProps {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  isLoading: boolean;
  attempts: number;
  errors: Record<string, string>;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
}

export const SignupFormFields: React.FC<SignupFormFieldsProps> = ({
  name,
  email,
  password,
  confirmPassword,
  isLoading,
  attempts,
  errors,
  onNameChange,
  onEmailChange,
  onPasswordChange,
  onConfirmPasswordChange,
}) => {
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-2 text-left">
          Full Name
        </label>
        <Input 
          id="name" 
          type="text" 
          placeholder="Enter your full name" 
          value={name} 
          onChange={e => onNameChange(e.target.value)} 
          className={errors.name ? "border-red-500" : ""}
          aria-invalid={!!errors.name}
          maxLength={100}
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
          onChange={e => onEmailChange(e.target.value)} 
          className={errors.email ? "border-red-500" : ""}
          aria-invalid={!!errors.email}
          maxLength={255}
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
          onChange={e => onPasswordChange(e.target.value)} 
          className={errors.password ? "border-red-500" : ""}
          aria-invalid={!!errors.password}
          minLength={8}
          required 
        />
        {errors.password && (
          <p className="text-red-500 text-xs mt-1">{errors.password}</p>
        )}
      </div>
      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2 text-left">
          Confirm Password
        </label>
        <Input 
          id="confirmPassword" 
          type="password" 
          placeholder="Confirm your password" 
          value={confirmPassword} 
          onChange={e => onConfirmPasswordChange(e.target.value)} 
          className={errors.confirmPassword ? "border-red-500" : ""}
          aria-invalid={!!errors.confirmPassword}
          minLength={8}
          required 
        />
        {errors.confirmPassword && (
          <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>
        )}
      </div>
      <Button type="submit" className="w-full" disabled={isLoading || attempts >= 3}>
        {isLoading ? 'Creating account...' : 'Sign up'}
      </Button>
    </div>
  );
};
