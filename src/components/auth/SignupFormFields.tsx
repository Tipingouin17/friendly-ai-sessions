/**
 * Signup Form Fields
 *
 * Auth component for the AIfacilitator application.
 */

import React, { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { getPasswordRequirementStatuses, validateEmailAddress } from '@/utils/inputValidation';

interface SignupFormFieldsProps {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  isLoading: boolean;
  attempts: number;
  errors: Record<string, string>;
  serverError?: string | null;
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
  serverError,
  onNameChange,
  onEmailChange,
  onPasswordChange,
  onConfirmPasswordChange,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailWarning, setEmailWarning] = useState<{ message: string; suggestion: string | null } | null>(null);

  const isDisabled = isLoading || attempts >= 3;
  const passwordRequirements = getPasswordRequirementStatuses(password);

  // Validate email on blur — catches typos and invalid domains
  const handleEmailBlur = useCallback(() => {
    if (!email) { setEmailWarning(null); return; }
    const result = validateEmailAddress(email);
    if (!result.isValid && result.error) {
      setEmailWarning({ message: result.error, suggestion: result.suggestion ?? null });
    } else {
      setEmailWarning(null);
    }
  }, [email]);

  // Clear warning as soon as the user starts editing again
  const handleEmailChange = useCallback((value: string) => {
    onEmailChange(value);
    if (emailWarning) setEmailWarning(null);
  }, [onEmailChange, emailWarning]);

  // One-click fix: replace the typo with the suggested address
  const applyEmailSuggestion = useCallback(() => {
    if (emailWarning?.suggestion) {
      onEmailChange(emailWarning.suggestion);
      setEmailWarning(null);
    }
  }, [emailWarning, onEmailChange]);

  return (
    <div className="space-y-4">
      {serverError && (
        <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}
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
          onChange={e => handleEmailChange(e.target.value)}
          onBlur={handleEmailBlur}
          className={errors.email || emailWarning ? "border-red-500" : ""}
          aria-invalid={!!errors.email || !!emailWarning}
          aria-describedby={emailWarning ? "email-warning" : undefined}
          autoComplete="email"
          maxLength={255}
          disabled={isDisabled}
          required 
        />
        {errors.email && (
          <p className="text-red-500 text-xs mt-1" role="alert">{errors.email}</p>
        )}
        {!errors.email && emailWarning && (
          <div
            id="email-warning"
            className="mt-1 flex items-start gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800"
            role="alert"
          >
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
            <span className="flex-1">{emailWarning.message}</span>
            {emailWarning.suggestion && (
              <button
                type="button"
                onClick={applyEmailSuggestion}
                className="ml-1 shrink-0 font-semibold underline hover:text-amber-900 focus:outline-none"
                aria-label={`Use ${emailWarning.suggestion} instead`}
              >
                Fix it
              </button>
            )}
          </div>
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
            aria-pressed={showPassword}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.password && (
          <p className="text-red-500 text-xs mt-1" role="alert">{errors.password}</p>
        )}
        <div id="password-hint" className="mt-2 grid grid-cols-1 gap-1 rounded-md bg-gray-50 p-3 text-xs sm:grid-cols-2">
          {passwordRequirements.map((requirement) => (
            <span
              key={requirement.key}
              className={requirement.met ? "font-medium text-green-700" : "text-gray-500"}
            >
              {requirement.met ? "✓" : "•"} {requirement.label}
            </span>
          ))}
        </div>
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
            aria-pressed={showConfirmPassword}
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
          Too many attempts. Please wait 5 minutes before trying again.
        </p>
      )}

      <Button type="submit" className="flex w-full items-center justify-center" disabled={isDisabled}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            <span>Creating account...</span>
          </>
        ) : (
          'Create account & request trial'
        )}
      </Button>
      <p className="text-center text-xs text-gray-500">
        After registration, contact Julia with this email address so your 3-month tester access can be activated manually.
      </p>
    </div>
  );
};
