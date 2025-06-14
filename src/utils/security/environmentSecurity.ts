
/**
 * Environment security validation utilities
 */

/**
 * Enhanced environment validation with security focus
 */
export const validateEnvironmentSecurity = (): { isSecure: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  const requiredVars = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY'
  ];
  
  const missing = requiredVars.filter(varName => !import.meta.env[varName]);
  
  if (missing.length > 0) {
    errors.push(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  // Validate Supabase URL format
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (supabaseUrl && !supabaseUrl.match(/^https:\/\/[a-z0-9-]+\.supabase\.co$/)) {
    errors.push('Invalid Supabase URL format');
  }
  
  // Check for secure protocols
  if (supabaseUrl && !supabaseUrl.startsWith('https://')) {
    errors.push('Supabase URL must use HTTPS');
  }
  
  // Development mode warning
  if (import.meta.env.DEV) {
    console.log('🔒 Security: Running in development mode - some security features may be relaxed');
  }
  
  return {
    isSecure: errors.length === 0,
    errors
  };
};
