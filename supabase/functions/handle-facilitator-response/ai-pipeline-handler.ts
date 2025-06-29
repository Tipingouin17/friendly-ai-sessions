
/**
 * Enhanced AI Pipeline Handler with comprehensive error handling and retry logic
 */

export interface AIGenerationResult {
  success: boolean;
  content: string;
  error?: string;
  attempt?: number;
  duration?: number;
  fallbackReason?: string;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  timeout: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 second
  timeout: 30000   // 30 seconds
};

/**
 * Validate OpenAI API key configuration
 */
export function validateOpenAIConfig(): { isValid: boolean; error?: string } {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!apiKey) {
    return { isValid: false, error: 'OPENAI_API_KEY not configured in Supabase secrets' };
  }
  
  if (!apiKey.startsWith('sk-')) {
    return { isValid: false, error: 'OPENAI_API_KEY appears to be invalid (should start with sk-)' };
  }
  
  if (apiKey.length < 50) {
    return { isValid: false, error: 'OPENAI_API_KEY appears to be too short' };
  }
  
  return { isValid: true };
}

/**
 * Enhanced OpenAI API call with comprehensive error handling
 */
export async function callOpenAIWithRetry(
  prompt: string,
  promptContent: string,
  generateReport: boolean = false,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<AIGenerationResult> {
  
  const apiValidation = validateOpenAIConfig();
  if (!apiValidation.isValid) {
    console.error('❌ OpenAI API configuration invalid:', apiValidation.error);
    return {
      success: false,
      content: '',
      error: `API Configuration Error: ${apiValidation.error}`,
      fallbackReason: 'api_config_invalid'
    };
  }
  
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;
  
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    const attemptStart = performance.now();
    
    console.log(`🤖 OpenAI API attempt ${attempt}/${config.maxAttempts}:`, {
      promptLength: prompt.length,
      contentLength: promptContent.length,
      generateReport,
      timeout: config.timeout
    });
    
    try {
      // Create AbortController for timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeout);
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: prompt },
            { role: 'user', content: promptContent }
          ],
          temperature: generateReport ? 0.3 : 0.7,
          max_tokens: 1000,
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const duration = performance.now() - attemptStart;
      
      console.log(`⚡ OpenAI API response received in ${duration.toFixed(2)}ms:`, {
        status: response.status,
        statusText: response.statusText,
        attempt
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Handle specific error types
        if (response.status === 429) {
          console.warn(`🚦 Rate limit hit on attempt ${attempt}:`, errorData);
          if (attempt < config.maxAttempts) {
            const delay = config.baseDelay * Math.pow(2, attempt - 1);
            console.log(`⏱️ Waiting ${delay}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          return {
            success: false,
            content: '',
            error: 'Rate limit exceeded',
            attempt,
            duration,
            fallbackReason: 'rate_limit_exceeded'
          };
        }
        
        if (response.status === 401) {
          console.error('🔐 Authentication failed:', errorData);
          return {
            success: false,
            content: '',
            error: 'Authentication failed - check API key',
            attempt,
            duration,
            fallbackReason: 'auth_failed'
          };
        }
        
        if (response.status >= 500) {
          console.error(`🔥 Server error (${response.status}):`, errorData);
          if (attempt < config.maxAttempts) {
            const delay = config.baseDelay * Math.pow(2, attempt - 1);
            console.log(`⏱️ Server error, waiting ${delay}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }
        
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.choices || !data.choices[0]?.message?.content) {
        console.error('❌ Invalid OpenAI response format:', data);
        throw new Error('Invalid response format from OpenAI');
      }
      
      const content = data.choices[0].message.content;
      
      console.log(`✅ OpenAI API success on attempt ${attempt}:`, {
        contentLength: content.length,
        duration: duration.toFixed(2) + 'ms',
        tokensUsed: data.usage?.total_tokens || 'unknown'
      });
      
      return {
        success: true,
        content,
        attempt,
        duration
      };
      
    } catch (error) {
      const duration = performance.now() - attemptStart;
      
      if (error.name === 'AbortError') {
        console.error(`⏰ Request timeout on attempt ${attempt} after ${config.timeout}ms`);
        if (attempt < config.maxAttempts) {
          continue;
        }
        return {
          success: false,
          content: '',
          error: `Request timeout after ${config.timeout}ms`,
          attempt,
          duration,
          fallbackReason: 'timeout'
        };
      }
      
      console.error(`💥 OpenAI API error on attempt ${attempt}:`, {
        error: error.message,
        duration: duration.toFixed(2) + 'ms',
        errorType: error.name
      });
      
      // Network errors - retry with exponential backoff
      if (error.message.includes('fetch') || error.message.includes('network')) {
        if (attempt < config.maxAttempts) {
          const delay = config.baseDelay * Math.pow(2, attempt - 1);
          console.log(`🔄 Network error, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        return {
          success: false,
          content: '',
          error: 'Network error - please check connectivity',
          attempt,
          duration,
          fallbackReason: 'network_error'
        };
      }
      
      // Final attempt failed
      if (attempt === config.maxAttempts) {
        return {
          success: false,
          content: '',
          error: error.message,
          attempt,
          duration,
          fallbackReason: 'max_attempts_exceeded'
        };
      }
    }
  }
  
  // Should never reach here, but just in case
  return {
    success: false,
    content: '',
    error: 'Unknown error in retry logic',
    fallbackReason: 'unknown_error'
  };
}

/**
 * Health check for AI pipeline
 */
export async function checkAIPipelineHealth(): Promise<{
  healthy: boolean;
  checks: Record<string, boolean>;
  errors: string[];
}> {
  const checks: Record<string, boolean> = {};
  const errors: string[] = [];
  
  // Check API key configuration
  const apiValidation = validateOpenAIConfig();
  checks.apiKeyValid = apiValidation.isValid;
  if (!apiValidation.isValid) {
    errors.push(apiValidation.error!);
  }
  
  // Test basic connectivity (without using quota)
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      },
    });
    checks.apiConnectivity = response.ok;
    if (!response.ok) {
      errors.push(`API connectivity failed: ${response.status}`);
    }
  } catch (error) {
    checks.apiConnectivity = false;
    errors.push(`API connectivity error: ${error.message}`);
  }
  
  const healthy = Object.values(checks).every(check => check);
  
  return { healthy, checks, errors };
}
