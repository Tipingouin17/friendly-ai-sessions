
import { supabase } from "@/integrations/supabase/client";
import { debugLog } from "@/utils/debugLogger";

/**
 * Gets a facilitator's avatar URL with improved error handling
 */
export const getFacilitatorAvatarUrl = async (facilitator: { id?: number, profile_picture?: string | null, title?: string }): Promise<string> => {
  // If no facilitator data provided, return placeholder
  if (!facilitator) {
    debugLog('all', 'No facilitator data provided, using placeholder avatar');
    return '/placeholder.svg';
  }
  
  try {
    debugLog('all', `Getting avatar for facilitator: ${JSON.stringify(facilitator)}`);
    
    // Case 1: If profile_picture exists and appears to be a valid path, use it directly
    if (facilitator.profile_picture) {
      debugLog('all', `Using facilitator profile picture: ${facilitator.profile_picture}`);
      
      // Check if it's a relative path to a public file
      if (facilitator.profile_picture.startsWith('/lovable-uploads/')) {
        return facilitator.profile_picture; // Return as-is, these are in public folder
      }
      
      // Apply URL normalization for other cases
      return normalizeFacilitatorAvatarUrl(facilitator.profile_picture);
    }
    
    // Case 2: Try to generate a URL from the facilitator ID
    if (facilitator.id) {
      // First try - storage bucket path with proper naming
      const { data: bucketData } = await supabase.storage
        .from('facilitator-avatars')
        .getPublicUrl(`${facilitator.id}.jpg`);
      
      if (bucketData?.publicUrl) {
        const normalizedUrl = normalizeFacilitatorAvatarUrl(bucketData.publicUrl);
        debugLog('all', `Generated storage URL for facilitator ${facilitator.id}: ${normalizedUrl}`);
        return normalizedUrl;
      }
      
      // Second try - check if there's an avatar with .png extension
      const { data: pngData } = await supabase.storage
        .from('facilitator-avatars')
        .getPublicUrl(`${facilitator.id}.png`);
        
      if (pngData?.publicUrl) {
        const normalizedUrl = normalizeFacilitatorAvatarUrl(pngData.publicUrl);
        debugLog('all', `Generated PNG storage URL for facilitator ${facilitator.id}: ${normalizedUrl}`);
        return normalizedUrl;
      }
      
      // Direct URL construction - for older setups
      const directUrl = `https://msahrdujupfcotujyluy.supabase.co/storage/v1/object/public/facilitator-avatars/${facilitator.id}.jpg`;
      const normalizedUrl = normalizeFacilitatorAvatarUrl(directUrl);
      debugLog('all', `Using direct URL for facilitator ${facilitator.id}: ${normalizedUrl}`);
      return normalizedUrl;
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
 * Normalizes a facilitator avatar URL to fix common issues
 * This function is critical for CORS and image loading
 */
export const normalizeFacilitatorAvatarUrl = (url: string): string => {
  if (!url) return '/placeholder.svg';
  
  try {
    debugLog('all', `Normalizing facilitator URL: ${url}`);
    
    // Handle direct paths to public folder
    if (url.startsWith('/lovable-uploads/')) {
      return url; // These are already in the correct format
    }
    
    // Handle placeholder URLs explicitly
    if (url === '/placeholder.svg' || url.includes('placeholder')) {
      return '/placeholder.svg';
    }
    
    // If URL is a data URL, return it unchanged
    if (url.startsWith('data:')) {
      return url;
    }
    
    // Handle absolute URLs that point to the current domain
    if (typeof window !== 'undefined' && url.startsWith(window.location.origin)) {
      // For URLs on the same domain, we can use them directly
      return url;
    }
    
    // Fix incorrect bucket name if present (facilitators-avatars → facilitator-avatars)
    let correctedUrl = url.includes('facilitators-avatars') 
      ? url.replace('facilitators-avatars', 'facilitator-avatars')
      : url;
    
    // Convert any relative URLs that look like partial storage paths
    if (correctedUrl.startsWith('/storage/') || correctedUrl.includes('/object/public/')) {
      correctedUrl = `https://msahrdujupfcotujyluy.supabase.co${correctedUrl.startsWith('/') ? '' : '/'}${correctedUrl}`;
    }
    
    // Handle API avatar URLs by just passing them through
    if (correctedUrl.includes('/api/avatar')) {
      return correctedUrl;
    }
    
    // Check if URL is a relative path but not a complete URL or API path
    if (correctedUrl.startsWith('/') && !correctedUrl.startsWith('/api/')) {
      // For relative paths like /lovable-uploads/..., ensure they have the proper base
      if (typeof window !== 'undefined') {
        const baseUrl = window.location.origin;
        correctedUrl = `${baseUrl}${correctedUrl}`;
      }
    }
    
    // Clean up any double slashes in the URL (except after protocol)
    correctedUrl = correctedUrl.replace(/([^:]\/)\/+/g, "$1");
    
    // Remove any query parameters or cache-busting timestamps that might cause CORS issues
    correctedUrl = correctedUrl.split('?')[0];
    
    debugLog('all', `Normalized facilitator avatar URL: ${correctedUrl}`);
    return correctedUrl;
  } catch (error) {
    console.error('Error normalizing URL:', error);
    return url; // Return original URL if normalization fails
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
  
  // First, check if it's a direct path to public images
  if (url.startsWith('/lovable-uploads/')) return true;
  
  // Check for Supabase storage URLs which are definitely images
  if (url.includes('supabase.co/storage/v1/object/public/facilitator-avatars')) return true;
  
  // Common image extensions
  if (url.match(/\.(jpeg|jpg|gif|png|svg|webp)$/i) !== null) return true;
  
  // Special cases for our application
  if (url.includes('/api/avatar')) return true;
  if (url.includes('facilitator-avatars')) return true;
  if (url.includes('facilitators-avatars')) return true;
  if (url.includes('supabase.co/storage')) return true;
  if (url.includes('lovable-uploads')) return true;
  
  // Check for image URLs with query parameters
  if (url.match(/\.(jpeg|jpg|gif|png|svg|webp)\?/i) !== null) return true;
  
  return false;
};
