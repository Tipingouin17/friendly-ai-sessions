/**
 * ReferralBanner
 *
 * A compact, dismissible banner shown to logged-in users on the My Workshops
 * page. Displays the user's unique referral link with a one-click copy button
 * and a link to the full Referrals page.
 *
 * The banner is dismissed via localStorage so it stays hidden after the user
 * closes it. It reappears after 7 days to keep the referral programme visible.
 */
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Gift, Copy, CheckCheck, X, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const DISMISSED_KEY = 'referral_banner_dismissed_until';
const DISMISS_DAYS = 7;

const ReferralBanner: React.FC = () => {
    const { user, isAuthenticated } = useAuth();
    const [copied, setCopied] = useState(false);
    const [visible, setVisible] = useState(false);

    // Only show after hydration and if not recently dismissed
    useEffect(() => {
        if (!isAuthenticated) return;
        try {
            const until = localStorage.getItem(DISMISSED_KEY);
            if (until && Date.now() < Number(until)) return;
        } catch {
            // localStorage unavailable — show banner
        }
        setVisible(true);
    }, [isAuthenticated]);

    if (!isAuthenticated || !user?.id || !visible) return null;

    const referralLink = `${window.location.origin}/signup?ref=${user.id}`;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(referralLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch {
            // Fallback for browsers that block clipboard API
            const el = document.createElement('textarea');
            el.value = referralLink;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        }
    };

    const handleDismiss = () => {
        try {
            const until = Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000;
            localStorage.setItem(DISMISSED_KEY, String(until));
        } catch {
            // ignore
        }
        setVisible(false);
    };

    return (
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 rounded-2xl bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100 px-4 py-3.5 mb-4">
            {/* Icon */}
            <div className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600">
                <Gift className="h-4.5 w-4.5" />
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-indigo-900 leading-tight">
                    Invite friends &amp; earn free months
                </p>
                <p className="text-xs text-indigo-600/80 mt-0.5 leading-tight">
                    Share your link — you both get rewarded when they subscribe.
                </p>
            </div>

            {/* Link + copy */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="flex items-center gap-1.5 flex-1 sm:flex-none min-w-0 bg-white border border-indigo-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-600 font-mono truncate max-w-[220px]">
                    <span className="truncate">{referralLink}</span>
                </div>
                <button
                    onClick={handleCopy}
                    className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors"
                    title="Copy referral link"
                >
                    {copied ? (
                        <><CheckCheck className="h-3.5 w-3.5" /> Copied</>
                    ) : (
                        <><Copy className="h-3.5 w-3.5" /> Copy</>
                    )}
                </button>
                <Link
                    to="/referrals"
                    className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg border border-indigo-200 bg-white hover:bg-indigo-50 text-indigo-700 text-xs font-semibold transition-colors"
                    title="View all referrals"
                >
                    View <ArrowRight className="h-3 w-3" />
                </Link>
            </div>

            {/* Dismiss */}
            <button
                onClick={handleDismiss}
                className="absolute top-2 right-2 p-1 rounded-md text-indigo-400 hover:text-indigo-600 hover:bg-indigo-100 transition-colors"
                title="Dismiss"
            >
                <X className="h-3.5 w-3.5" />
            </button>
        </div>
    );
};

export default ReferralBanner;
