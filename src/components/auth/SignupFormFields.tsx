
import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Eye, EyeOff } from 'lucide-react';

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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const isDisabled = isLoading || attempts >= 3;

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
          autoComplete="name"
          autoFocus
          maxLength={100}
          disabled={isDisabled}
          required 
        />
        {errors.name && (
          <p className="text-red-500 text-xs mt-1" role="alert">{errors.name}</p>
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
          autoComplete="email"
          maxLength={255}
          disabled={isDisabled}
          required 
        />
        {errors.email && (
          <p className="text-red-500 text-xs mt-1" role="alert">{errors.email}</p>
        )}
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium mb-2 text-left">
          Password
        </label>
        <div className="relative">
          <Input 
            id="password" 
            type={showPassword ? "text" : "password"}
            placeholder="Create a password" 
            value={password} 
            onChange={e => onPasswordChange(e.target.value)} 
            className={`pr-10 ${errors.password ? "border-red-500" : ""}`}
            aria-invalid={!!errors.password}
            aria-describedby="password-hint"
            autoComplete="new-password"
            minLength={8}
            disabled={isDisabled}
            required 
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
            aria-label={showPassword ? "Hide password" : "Show password"}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.password ? (
          <p className="text-red-500 text-xs mt-1" role="alert">{errors.password}</p>
        ) : (
          <p id="password-hint" className="text-gray-400 text-xs mt-1">
            Must be at least 8 characters
          </p>
        )}
      </div>
      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2 text-left">
          Confirm Password
        </label>
        <div className="relative">
          <Input 
            id="confirmPassword" 
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Confirm your password" 
            value={confirmPassword} 
            onChange={e => onConfirmPasswordChange(e.target.value)} 
            className={`pr-10 ${errors.confirmPassword ? "border-red-500" : ""}`}
            aria-invalid={!!errors.confirmPassword}
            autoComplete="new-password"
            minLength={8}
            disabled={isDisabled}
            required 
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            tabIndex={-1}
          >
            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.confirmPassword && (
          <p className="text-red-500 text-xs mt-1" role="alert">{errors.confirmPassword}</p>
        )}
      </div>

      {attempts >= 3 && (
        <p className="text-indigo-600 text-xs text-center">
          Too many attempts. Please wait a few minutes before trying again.
        </p>
      )}

      <Button type="submit" className="w-full" disabled={isDisabled}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating account...
          </>
        ) : (
          'Sign up'
        )}
      </Button>
    </div>
  );
};
