/**
 * CookieBanner — GDPR-compliant cookie consent banner.
 *
 * Behaviour:
 * - Shown on first visit (no cookie preference stored yet).
 * - "Accept optional cookies" → stores consent for analytics + advertising, loads tracking scripts.
 * - "Reject optional cookies" → stores refusal, no optional scripts loaded.
 * - "Manage preferences" → granular toggle panel (analytics / advertising separately).
 * - Consent is stored in localStorage under the key "cookie_consent_v1".
 * - The tracking module (src/lib/tracking.ts) reads this consent before loading any script.
 * - A "Cookie Settings" link in the footer re-opens this banner.
 *
 * Consent schema stored in localStorage:
 * {
 *   version: 1,
 *   timestamp: ISO string,
 *   analytics: boolean,
 *   advertising: boolean,
 * }
 */

import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronUp, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export const CONSENT_KEY = "cookie_consent_v1";

export interface CookieConsent {
  version: number;
  timestamp: string;
  analytics: boolean;
  advertising: boolean;
}

/** Read stored consent. Returns null if the user has not yet made a choice. */
export function getStoredConsent(): CookieConsent | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CookieConsent;
    if (parsed.version !== 1) return null; // force re-consent on version bump
    return parsed;
  } catch {
    return null;
  }
}

/** Persist consent and dispatch a custom event so tracking.ts can react. */
export function saveConsent(analytics: boolean, advertising: boolean): void {
  const consent: CookieConsent = {
    version: 1,
    timestamp: new Date().toISOString(),
    analytics,
    advertising,
  };
  localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
  // Notify the tracking module
  window.dispatchEvent(new CustomEvent("cookie-consent-updated", { detail: consent }));
}

// ─────────────────────────────────────────────────────────────────────────────

interface CookieBannerProps {
  /** Force the banner to show (used by the "Cookie Settings" footer link). */
  forceOpen?: boolean;
  onClose?: () => void;
}

export const CookieBanner = ({ forceOpen = false, onClose }: CookieBannerProps) => {
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  const [advertisingEnabled, setAdvertisingEnabled] = useState(true);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (forceOpen) {
      // Pre-fill toggles from stored consent if available
      const stored = getStoredConsent();
      if (stored) {
        setAnalyticsEnabled(stored.analytics);
        setAdvertisingEnabled(stored.advertising);
      }
      setVisible(true);
      return;
    }
    // Show only if no consent decision has been stored yet
    const stored = getStoredConsent();
    if (!stored) setVisible(true);
  }, [forceOpen]);

  useEffect(() => {
    if (!visible) return;
    const frame = window.requestAnimationFrame(() => dialogRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [visible]);

  const close = () => {
    setVisible(false);
    onClose?.();
  };

  const handleAcceptAll = () => {
    saveConsent(true, true);
    close();
  };

  const handleRejectAll = () => {
    saveConsent(false, false);
    close();
  };

  const handleSavePreferences = () => {
    saveConsent(analyticsEnabled, advertisingEnabled);
    close();
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-slate-950/45 p-3 pt-12 backdrop-blur-[2px] sm:items-center sm:p-6">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cookie-consent-title"
        tabIndex={-1}
        className="max-h-[calc(100dvh-1.5rem)] w-full max-w-xl overflow-y-auto rounded-[1.75rem] border border-indigo-100 bg-white shadow-2xl shadow-slate-950/30 outline-none"
      >

        {/* Header */}
        <div className="border-b border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-violet-50 px-5 pb-4 pt-5 sm:px-6 sm:pt-6">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-indigo-600 p-2.5 shadow-lg shadow-indigo-500/25">
              <Shield size={20} className="text-white" />
            </div>
            <div className="min-w-0">
              <h2 id="cookie-consent-title" className="text-lg font-bold tracking-tight text-slate-950">Your privacy choices</h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">Essential cookies keep the service working. Please choose whether optional cookies may help us improve it and measure campaigns.</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-4 sm:px-6">
          <p className="text-sm leading-relaxed text-slate-600">
            You can change this choice at any time. See our{" "}
            <Link to="/privacy" className="font-semibold text-indigo-700 underline underline-offset-2 hover:text-indigo-900" onClick={close}>
              Privacy Policy
            </Link>{" "}
            for details.
          </p>

          {/* Granular preferences panel */}
          {showDetails && (
            <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">

              {/* Strictly necessary — always on */}
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label className="text-xs font-semibold text-gray-800">Strictly necessary</Label>
                  <p className="text-xs text-gray-500 mt-0.5">Authentication, session management. Cannot be disabled.</p>
                </div>
                <Switch checked disabled aria-label="Strictly necessary cookies (always on)" />
              </div>

              {/* Analytics */}
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label htmlFor="cookie-analytics" className="text-xs font-semibold text-gray-800">Analytics</Label>
                  <p className="text-xs text-gray-500 mt-0.5">Google Analytics 4, Microsoft Clarity — help us understand how the site is used.</p>
                </div>
                <Switch
                  id="cookie-analytics"
                  checked={analyticsEnabled}
                  onCheckedChange={setAnalyticsEnabled}
                  aria-label="Analytics cookies"
                />
              </div>

              {/* Advertising */}
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label htmlFor="cookie-advertising" className="text-xs font-semibold text-gray-800">Advertising</Label>
                  <p className="text-xs text-gray-500 mt-0.5">Google Ads, Microsoft Ads — measure the effectiveness of our advertising campaigns.</p>
                </div>
                <Switch
                  id="cookie-advertising"
                  checked={advertisingEnabled}
                  onCheckedChange={setAdvertisingEnabled}
                  aria-label="Advertising cookies"
                />
              </div>
            </div>
          )}

          {/* Toggle details link */}
          <button
            onClick={() => setShowDetails(v => !v)}
            aria-expanded={showDetails}
            className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 text-sm font-semibold text-indigo-800 transition-colors hover:bg-indigo-100"
          >
            {showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {showDetails ? "Hide privacy choices" : "Manage privacy choices"}
          </button>
        </div>

        {/* Footer buttons: equal-size, explicit consent choices. */}
        <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/80 px-5 pb-[max(env(safe-area-inset-bottom),1.25rem)] pt-4 sm:flex-row sm:px-6">
          {showDetails ? (
            <>
              <Button
                size="sm"
                onClick={handleSavePreferences}
                className="min-h-12 flex-1 rounded-xl bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Save my preferences
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleRejectAll}
                className="min-h-12 flex-1 rounded-xl border-slate-300 bg-white text-sm font-semibold text-slate-800 hover:bg-slate-100"
              >
                Reject optional cookies
              </Button>
            </>
          ) : (
            <>
              <Button
                size="sm"
                onClick={handleAcceptAll}
                className="min-h-12 flex-1 rounded-xl bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Accept optional cookies
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleRejectAll}
                className="min-h-12 flex-1 rounded-xl border-slate-300 bg-white text-sm font-semibold text-slate-800 hover:bg-slate-100"
              >
                Reject optional cookies
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CookieBanner;
