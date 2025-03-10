
import React from 'react';
import { Loader2 } from 'lucide-react';

export const CheckoutLoadingState = () => {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      <span className="ml-2">Loading checkout...</span>
    </div>
  );
};
