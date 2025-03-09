
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface ValidationErrorsProps {
  fieldErrors: Record<string, string>;
  generalError: string | null;
}

export const ValidationErrors = ({ fieldErrors, generalError }: ValidationErrorsProps) => {
  // Only show the general validation error alert if there are field errors excluding 'card'
  const hasFieldErrors = Object.keys(fieldErrors).length > 0 && 
    Object.keys(fieldErrors).some(key => key !== 'card');
  
  if (!hasFieldErrors && !generalError) {
    return null;
  }
  
  return (
    <>
      {hasFieldErrors && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please correct the highlighted fields below.
          </AlertDescription>
        </Alert>
      )}
      
      {generalError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{generalError}</AlertDescription>
        </Alert>
      )}
    </>
  );
};
