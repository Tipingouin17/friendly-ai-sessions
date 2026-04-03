/**
 * Welcome Message Loader
 *
 * Session component for the AIfacilitator application.
 */

import React from 'react';
import { Loader2 } from 'lucide-react';

interface WelcomeMessageLoaderProps {
  isGenerating: boolean;
}

const WelcomeMessageLoader: React.FC<WelcomeMessageLoaderProps> = ({ isGenerating }) => {
  if (!isGenerating) return null;

  return (
    <div className="flex items-center justify-center py-8 px-4">
      <div className="flex items-center gap-3 text-gray-600">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Generating welcome message...</span>
      </div>
    </div>
  );
};

export default WelcomeMessageLoader;
