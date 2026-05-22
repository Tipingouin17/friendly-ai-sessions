/**
 * CookieBanner — GDPR-compliant cookie consent banner.
 *
 * Behaviour:
 * - Shown on first visit (no cookie preference stored yet).
 * - "Accept all" → stores consent for analytics + advertising, loads tracking scripts.
 * - "Reject all" → stores refusal, no optional scripts loaded.
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

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { X, ChevronDown, ChevronUp, Shield } from "lucide-react";
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
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Cookie consent"
      className="fixed bottom-0 left-0 right-0 z-[9999] p-3 sm:p-4 pointer-events-none"
    >
      <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-2xl border border-gray-100 pointer-events-auto overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-4 pt-4 pb-2">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-indigo-50 rounded-lg">
              <Shield size={16} className="text-indigo-600" />
            </div>
            <p className="text-sm font-semibold text-gray-900">We respect your privacy</p>
          </div>
          <button
            onClick={handleRejectAll}
            aria-label="Reject all and close"
            className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 mt-0.5"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-4 pb-3">
          <p className="text-xs text-gray-600 leading-relaxed">
            We use essential cookies to run the service. Optional analytics and advertising cookies help us improve AIfacilitator and measure campaigns.
            See our{" "}
            <Link to="/privacy" className="text-indigo-600 hover:underline" onClick={close}>
              Privacy Policy
            </Link>{" "}
            for full details.
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
            className="mt-3 flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            {showDetails ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {showDetails ? "Hide preferences" : "Manage preferences"}
          </button>
        </div>

        {/* Footer buttons */}
        <div className="flex flex-col sm:flex-row gap-2 px-4 pb-4">
          {showDetails ? (
            <>
              <Button
                size="sm"
                onClick={handleSavePreferences}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full text-xs"
              >
                Save my preferences
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleRejectAll}
                className="flex-1 rounded-full text-xs border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                Reject all
              </Button>
            </>
          ) : (
            <>
              <Button
                size="sm"
                onClick={handleAcceptAll}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full text-xs"
              >
                Accept all
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleRejectAll}
                className="flex-1 rounded-full text-xs border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                Reject all
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CookieBanner;
