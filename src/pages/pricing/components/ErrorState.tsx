
import { Card } from "@/components/ui/card";

interface ErrorStateProps {
  error: Error;
}

export const ErrorState = ({ error }: ErrorStateProps) => (
  <Card className="p-6 bg-red-50 border-red-200">
    <p className="text-red-600 font-medium">Error loading pricing plans</p>
    <p className="text-red-500 text-sm mt-1">{error.message}</p>
  </Card>
);
