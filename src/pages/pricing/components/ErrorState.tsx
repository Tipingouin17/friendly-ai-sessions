/**
 * Error State
 *
 * Page for the AIfacilitator application.
 */

import { Card } from "@/components/ui/card";

interface ErrorStateProps {
  error: Error;
}

export const ErrorState = ({ error }: ErrorStateProps) => {
  // Keep the raw error available to the calling boundary without disclosing
  // implementation details such as provider or database messages to visitors.
  void error;
  return (
    <Card className="p-6 bg-red-50 border-red-200" role="alert">
      <p className="text-red-600 font-medium">Error loading pricing plans</p>
      <p className="text-red-500 text-sm mt-1">Something went wrong. Please try again later.</p>
    </Card>
  );
};
