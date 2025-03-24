
import { isInCrossOriginContext } from '@/utils/crossOriginUtils';
import { debugLog } from '@/utils/debugLogger';

// Process a facilitator avatar URL to ensure it's properly formatted
export const processFacilitatorAvatar = (avatarUrl: string | undefined): string => {
  if (!avatarUrl || avatarUrl === '/placeholder.svg') {
    return `/api/avatar?name=Facilitator&variant=beam&palette=2`;
  }
  
  // Normalize URLs with double slashes
  let processedUrl = avatarUrl.replace(/([^:])\/\//g, '$1/');
  
  // Add crossorigin parameter if needed
  if (isInCrossOriginContext() && !processedUrl.includes('crossorigin=anonymous')) {
    processedUrl += (processedUrl.includes('?') ? '&' : '?') + 'crossorigin=anonymous';
  }
  
  debugLog('all', `Processed facilitator avatar: ${processedUrl}`);
  return processedUrl;
};
