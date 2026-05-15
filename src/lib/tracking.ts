/**
 * Centralized acquisition and conversion tracking — GDPR-compliant.
 *
 * Scripts are only loaded when the user has given explicit consent via the
 * CookieBanner component. Consent is stored in localStorage under the key
 * "cookie_consent_v1" (see src/components/CookieBanner.tsx).
 *
 * Strictly necessary tags (Microsoft UET for conversion measurement) are
 * loaded only after advertising consent.
 *
 * This module deliberately keeps all marketing tags behind safe wrappers so
 * application code never fails if a third-party script is blocked, delayed, or
 * not configured in the current environment.
 */

import { getStoredConsent } from "@/components/CookieBanner";

type GtagCommand = 'js' | 'config' | 'event' | 'set';
type GtagArguments = [GtagCommand, ...unknown[]];

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: GtagArguments) => void;
    uetq?: Array<Record<string, unknown>> & { push: (...args: unknown[]) => number };
    clarity?: (...args: unknown[]) => void;
  }
}

const DEFAULT_GOOGLE_ADS_ID = 'AW-18162348578';
const DEFAULT_MICROSOFT_UET_ID = '343249109';

const config = {
  ga4MeasurementId: import.meta.env.VITE_GA4_MEASUREMENT_ID as string | undefined,
  googleAdsId: (import.meta.env.VITE_GOOGLE_ADS_ID as string | undefined) || DEFAULT_GOOGLE_ADS_ID,
  googleAdsSignupConversionLabel: import.meta.env.VITE_GOOGLE_ADS_SIGNUP_CONVERSION_LABEL as string | undefined,
  googleAdsContactConversionLabel: import.meta.env.VITE_GOOGLE_ADS_CONTACT_CONVERSION_LABEL as string | undefined,
  googleAdsBeginCheckoutConversionLabel: import.meta.env.VITE_GOOGLE_ADS_BEGIN_CHECKOUT_CONVERSION_LABEL as string | undefined,
  googleAdsPurchaseConversionLabel: import.meta.env.VITE_GOOGLE_ADS_PURCHASE_CONVERSION_LABEL as string | undefined,
  microsoftUetId: (import.meta.env.VITE_MICROSOFT_UET_ID as string | undefined) || DEFAULT_MICROSOFT_UET_ID,
  clarityProjectId: import.meta.env.VITE_CLARITY_PROJECT_ID as string | undefined,
};

let gtagInitialized = false;
let clarityInitialized = false;
let uetInitialized = false;

function hasValue(value?: string): value is string {
  return Boolean(value && value.trim().length > 0 && !value.includes('your_'));
}

function appendScript(id: string, src: string): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(id)) return;

  const script = document.createElement('script');
  script.id = id;
  script.async = true;
  script.src = src;
  document.head.appendChild(script);
}

/** Load Google Analytics 4 + Google Ads — requires analytics AND advertising consent. */
function initGtag(analyticsConsent: boolean, advertisingConsent: boolean): void {
  if (gtagInitialized) return;

  // GA4 requires analytics consent; Google Ads requires advertising consent.
  const loadGa4 = analyticsConsent && hasValue(config.ga4MeasurementId);
  const loadGads = advertisingConsent && hasValue(config.googleAdsId);

  if (!loadGa4 && !loadGads) return;

  gtagInitialized = true;

  const primaryId = loadGa4 ? config.ga4MeasurementId! : config.googleAdsId;
  appendScript('aifacilitator-gtag', `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(primaryId)}`);

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag(...args: GtagArguments) {
    window.dataLayer?.push(args);
  };

  window.gtag('js', new Date());

  if (loadGa4) {
    window.gtag('config', config.ga4MeasurementId!, { send_page_view: false });
  }

  if (loadGads) {
    window.gtag('config', config.googleAdsId, { send_page_view: false });
  }
}

/** Load Microsoft Clarity — requires analytics consent. */
function initClarity(analyticsConsent: boolean): void {
  if (clarityInitialized || !analyticsConsent || !hasValue(config.clarityProjectId) || typeof window === 'undefined') return;

  clarityInitialized = true;
  window.clarity = window.clarity || function clarity(...args: unknown[]) {
    (window.clarity as unknown[]).push(args);
  } as Window['clarity'];

  appendScript('aifacilitator-clarity', `https://www.clarity.ms/tag/${encodeURIComponent(config.clarityProjectId)}`);
}

/** Load Microsoft UET tag — requires advertising consent. */
function initUet(advertisingConsent: boolean): void {
  if (uetInitialized || !advertisingConsent || !hasValue(config.microsoftUetId) || typeof window === 'undefined') return;

  uetInitialized = true;

  // Inject the UET inline bootstrap (same as the snippet in index.html but deferred)
  if (!window.uetq) {
    window.uetq = [] as typeof window.uetq;
  }

  appendScript('aifacilitator-uet', `https://bat.bing.com/bat.js`);

  // Configure UET after script loads
  const uetId = config.microsoftUetId;
  const uetScript = document.createElement('script');
  uetScript.id = 'aifacilitator-uet-config';
  uetScript.textContent = `
    window.uetq = window.uetq || [];
    (function(w,d,t,r,u){var f,n,i;w[u]=w[u]||[],f=function(){var o={ti:"${uetId}",enableAutoSpaTracking:true};o.q=w[u],w[u]=new UET(o),w[u].push("pageLoad")},n=d.createElement(t),n.src=r,n.async=1,n.onload=n.onreadystatechange=function(){var s=this.readyState;s&&s!=="loaded"&&s!=="complete"||(f(),n.onload=n.onreadystatechange=null)},i=d.getElementsByTagName(t)[0],i.parentNode.insertBefore(n,i)})(window,document,"script","//bat.bing.com/bat.js","uetq");
  `;
  if (!document.getElementById('aifacilitator-uet-config')) {
    document.head.appendChild(uetScript);
  }
}

/**
 * Initialize tracking scripts based on stored cookie consent.
 * Called on app mount and whenever consent is updated.
 */
export function initializeTracking(): void {
  if (typeof window === 'undefined') return;

  const consent = getStoredConsent();

  // No consent decision yet — do not load any optional scripts.
  if (!consent) return;

  initGtag(consent.analytics, consent.advertising);
  initClarity(consent.analytics);
  initUet(consent.advertising);
}

/** Re-initialize tracking after consent is updated (called by cookie-consent-updated event). */
export function reinitializeTracking(): void {
  // Reset flags so scripts can be loaded if consent was just granted
  gtagInitialized = false;
  clarityInitialized = false;
  uetInitialized = false;
  initializeTracking();
}

export function trackPageView(path: string, title = document.title): void {
  initializeTracking();

  const consent = getStoredConsent();
  if (!consent) return;

  const pageLocation = `${window.location.origin}${path}`;

  if (consent.analytics && hasValue(config.ga4MeasurementId) && window.gtag) {
    window.gtag('event', 'page_view', {
      page_title: title,
      page_location: pageLocation,
      page_path: path,
    });
  }

  if (consent.advertising && hasValue(config.googleAdsId) && window.gtag) {
    window.gtag('config', config.googleAdsId, {
      page_title: title,
      page_location: pageLocation,
      page_path: path,
    });
  }

  if (consent.advertising && window.uetq) {
    window.uetq.push('event', 'page_view', {
      page_path: path,
      page_location: pageLocation,
    });
  }
}

function trackGa4Event(eventName: string, parameters: Record<string, unknown> = {}): void {
  const consent = getStoredConsent();
  if (!consent?.analytics) return;
  initializeTracking();

  if (hasValue(config.ga4MeasurementId) && window.gtag) {
    window.gtag('event', eventName, parameters);
  }
}

function trackGoogleAdsConversion(label?: string, parameters: Record<string, unknown> = {}): void {
  const consent = getStoredConsent();
  if (!consent?.advertising) return;
  initializeTracking();

  if (!hasValue(config.googleAdsId) || !hasValue(label) || !window.gtag) return;

  window.gtag('event', 'conversion', {
    send_to: `${config.googleAdsId}/${label}`,
    ...parameters,
  });
}

function trackMicrosoftEvent(eventName: string, parameters: Record<string, unknown> = {}): void {
  const consent = getStoredConsent();
  if (!consent?.advertising) return;
  if (!window.uetq) return;

  window.uetq.push('event', eventName, {
    event_category: 'acquisition',
    ...parameters,
  });
}

export function trackSignup(method = 'email'): void {
  const parameters = {
    method,
    event_category: 'acquisition',
    event_label: 'account_created',
  };

  trackGa4Event('sign_up', parameters);
  trackGoogleAdsConversion(config.googleAdsSignupConversionLabel, parameters);
  trackMicrosoftEvent('sign_up', parameters);
}

export function trackContactLead(): void {
  const parameters = {
    event_category: 'acquisition',
    event_label: 'contact_form',
  };

  trackGa4Event('generate_lead', parameters);
  trackGoogleAdsConversion(config.googleAdsContactConversionLabel, parameters);
  trackMicrosoftEvent('generate_lead', parameters);
}

export function trackBeginCheckout(planName?: string, value?: number, currency = 'EUR'): void {
  const parameters = {
    event_category: 'monetization',
    event_label: planName || 'pricing_checkout',
    currency,
    value,
  };

  trackGa4Event('begin_checkout', parameters);
  trackGoogleAdsConversion(config.googleAdsBeginCheckoutConversionLabel, parameters);
  trackMicrosoftEvent('begin_checkout', parameters);
}

export function trackPurchase(transactionId: string, value?: number, currency = 'EUR'): void {
  const parameters = {
    transaction_id: transactionId,
    currency,
    value,
  };

  trackGa4Event('purchase', parameters);
  trackGoogleAdsConversion(config.googleAdsPurchaseConversionLabel, parameters);
  trackMicrosoftEvent('purchase', parameters);
}
