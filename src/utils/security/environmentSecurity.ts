/**
 * Environment security validation utilities
 */
export const validateEnvironmentSecurity = (): { isSecure: boolean; errors: string[] } => {
  const errors: string[] = [];

  const requiredVars = ['VITE_API_URL', 'VITE_API_ANON_KEY'];
  const missing = requiredVars.filter((v) => !import.meta.env[v]);
  if (missing.length > 0) {
    errors.push(`Missing required environment variables: ${missing.join(', ')}`);
  }

  const apiUrl = import.meta.env.VITE_API_URL as string;
  if (apiUrl && !apiUrl.startsWith('https://') && !apiUrl.startsWith('http://localhost')) {
    errors.push('API URL must use HTTPS in production');
  }

  return { isSecure: errors.length === 0, errors };
};
