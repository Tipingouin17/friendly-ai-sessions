/**
 * facilitator Utils
 *
 * Utility for the AIfacilitator application.
 */

import { supabase } from "@/integrations/supabase/client";
import { debugLog } from "@/utils/debugLogger";

/**
 * Checks if we're in a browser environment (client-side)
 */
const isBrowser = () => typeof window !== 'undefined';

/**
 * Checks if we're in a cross-origin context safely
 */
const isInCrossOriginContext = () => {
  if (!isBrowser()) return false;

  try {
    return window.location !== window.parent.location;
  } catch {
    return true; // If we can't access parent.location, we're likely in cross-origin
  }
};

/**
 * Gets a facilitator's avatar URL
 * Supports: filenames, full URLs, and relative paths
 * Recommended: Store only filenames in database for portability
 */
export const getFacilitatorAvatarUrl = async (facilitator: { id?: number, profile_picture?: string | null, title?: string }): Promise<string> => {
  // If no facilitator data provided, return placeholder
  if (!facilitator) {
    debugLog('all', 'No facilitator data provided, using placeholder avatar');
    return '/placeholder.svg';
  }

  // Server-side rendering safety check
  if (!isBrowser()) {
    debugLog('all', 'Server-side rendering detected, using placeholder avatar');
    return '/placeholder.svg';
  }

  try {
    // Case 1: If profile_picture exists, process it
    if (facilitator.profile_picture) {
      const pic = facilitator.profile_picture;
      debugLog('all', `Processing facilitator profile picture: ${pic}`);

      // If it's already a full URL (http/https), use it directly
      if (pic.startsWith('http://') || pic.startsWith('https://')) {
        debugLog('all', `Using full URL: ${pic}`);
        return pic;
      }

      // If it's a relative path to public assets, use it directly
      if (pic.startsWith('/avatars/') || pic.startsWith('/public/')) {
        debugLog('all', `Using public asset path: ${pic}`);
        return pic;
      }

      // Otherwise, treat it as a filename in the facilitator-avatars bucket
      // This is the recommended approach for both system and user-uploaded avatars
      const { data } = await supabase.storage
        .from('facilitator-avatars')
        .getPublicUrl(pic);

      if (data?.publicUrl) {
        debugLog('all', `Generated storage URL for ${pic}: ${data.publicUrl}`);
        return data.publicUrl;
      }
    }

    // Case 2: No profile_picture, try to generate URL from ID
    if (facilitator.id) {
      try {
        const filename = `${facilitator.id}.jpg`;
        const { data } = await supabase.storage
          .from('facilitator-avatars')
          .getPublicUrl(filename);

        if (data?.publicUrl) {
          debugLog('all', `Generated avatar URL for facilitator ${facilitator.id}: ${data.publicUrl}`);
          return data.publicUrl;
        }
      } catch (error) {
        console.error('Error getting public URL from Supabase storage:', error);
      }
    }

    // Case 3: Fall back to a generated avatar with the facilitator's title as seed
    const nameSeed = facilitator.title || `Facilitator-${facilitator.id || 'Unknown'}`;
    const fallbackUrl = `/api/avatar?name=${encodeURIComponent(nameSeed)}&variant=beam`;
    debugLog('all', `Using generated avatar for facilitator: ${nameSeed}`);
    return fallbackUrl;
  } catch (error) {
    console.error('Error generating avatar URL:', error);
    return '/placeholder.svg';
  }
};

/**
 * Handles image loading errors by setting a fallback image
 */
export const handleAvatarError = (e: React.SyntheticEvent<HTMLImageElement>): void => {
  console.warn('Avatar image failed to load, using placeholder', e.currentTarget.src);
  e.currentTarget.src = '/placeholder.svg';
};

/**
 * A more robust check if the URL is for an image
 */
export const isImageUrl = (url: string): boolean => {
  if (!url) return false;

  // Direct paths to public images
  if (url.startsWith('/avatars/') || url.startsWith('/public/')) return true;

  // Normalize URL before checking
  const normalizedUrl = url.replace(/([^:])\/\//g, '$1/');

  // Legacy storage URLs (kept for backward compatibility with any pre-migration data)
  if (normalizedUrl.includes('supabase.co/storage/v1/object/public/')) return true;

  // Common image extensions
  if (normalizedUrl.match(/\.(jpeg|jpg|gif|png|svg|webp)$/i) !== null) return true;

  // API avatar URLs
  if (normalizedUrl.includes('/api/avatar')) return true;

  // Check for full URLs starting with http/https
  if (normalizedUrl.match(/^https?:\/\/.+/i)) {
    // If it has a query parameter and no file extension, we'll trust it
    if (normalizedUrl.includes('?') || normalizedUrl.includes('.')) {
      return true;
    }
  }

  return false;
};
