import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Parse user agent to extract device info
const parseUserAgent = (userAgent: string) => {
    const ua = userAgent.toLowerCase();

    // Detect device type
    let deviceType = 'desktop';
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(userAgent)) {
        deviceType = 'tablet';
    } else if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(userAgent)) {
        deviceType = 'mobile';
    }

    // Detect browser
    let browser = 'Unknown';
    if (ua.includes('edg/')) browser = 'Edge';
    else if (ua.includes('chrome')) browser = 'Chrome';
    else if (ua.includes('firefox')) browser = 'Firefox';
    else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari';
    else if (ua.includes('opera') || ua.includes('opr/')) browser = 'Opera';

    // Detect OS
    let os = 'Unknown';
    if (ua.includes('win')) os = 'Windows';
    else if (ua.includes('mac')) os = 'macOS';
    else if (ua.includes('linux')) os = 'Linux';
    else if (ua.includes('android')) os = 'Android';
    else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';

    return { deviceType, browser, os };
};

// Generate a unique session token
const generateSessionToken = () => {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
};

// Get or create session token from localStorage
const getSessionToken = () => {
    let token = localStorage.getItem('session_token');
    if (!token) {
        token = generateSessionToken();
        localStorage.setItem('session_token', token);
    }
    return token;
};

export const useSessionTracking = () => {
    const { user, isAuthenticated } = useAuth();

    useEffect(() => {
        if (!isAuthenticated || !user) return;

        const sessionToken = getSessionToken();
        const userAgent = navigator.userAgent;
        const { deviceType, browser, os } = parseUserAgent(userAgent);

        // Create or update session
        const trackSession = async () => {
            try {
                // Check if session exists
                const { data: existingSession } = await supabase
                    .from('user_sessions')
                    .select('id')
                    .eq('session_token', sessionToken)
                    .single();

                if (existingSession) {
                    // Update existing session
                    await supabase
                        .from('user_sessions')
                        .update({
                            last_activity: new Date().toISOString(),
                            is_current: true,
                        })
                        .eq('session_token', sessionToken);

                    // Mark other sessions as not current
                    await supabase
                        .from('user_sessions')
                        .update({ is_current: false })
                        .eq('user_id', user.id)
                        .neq('session_token', sessionToken);
                } else {
                    // Create new session
                    await supabase.from('user_sessions').insert({
                        user_id: user.id,
                        session_token: sessionToken,
                        device_type: deviceType,
                        browser,
                        os,
                        user_agent: userAgent,
                        is_current: true,
                        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
                    });

                    // Mark other sessions as not current
                    await supabase
                        .from('user_sessions')
                        .update({ is_current: false })
                        .eq('user_id', user.id)
                        .neq('session_token', sessionToken);
                }
            } catch (error) {
                console.error('Error tracking session:', error);
            }
        };

        trackSession();

        // Update last activity every 5 minutes
        const interval = setInterval(() => {
            supabase
                .from('user_sessions')
                .update({ last_activity: new Date().toISOString() })
                .eq('session_token', sessionToken)
                .then(() => { /* no-op */ });
        }, 5 * 60 * 1000); // 5 minutes

        return () => clearInterval(interval);
    }, [user, isAuthenticated]);

    // Cleanup on logout
    useEffect(() => {
        if (!isAuthenticated) {
            const sessionToken = localStorage.getItem('session_token');
            if (sessionToken) {
                // Mark session as revoked
                supabase
                    .from('user_sessions')
                    .update({ revoked_at: new Date().toISOString() })
                    .eq('session_token', sessionToken)
                    .then(() => {
                        localStorage.removeItem('session_token');
                    });
            }
        }
    }, [isAuthenticated]);
};
