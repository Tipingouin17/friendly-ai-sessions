/**
 * Centralized acquisition and conversion tracking — GDPR-compliant.
 *
 * Scripts are only loaded when the user has given explicit consent via the
 * CookieBanner component. Consent is stored in localStorage under the key
 * "cookie_consent_v1" (see src/components/CookieBanner.tsx).
 *
 * This module deliberately keeps all marketing tags behind safe wrappers so
 * application code never fails if a third-party script is blocked, delayed, or
 * not configured in the current environment.
 */

import { getStoredConsent } from "@/components/CookieBanner";

type GtagCommand = 'js' | 'config' | 'event' | 'set' | 'consent';
type GtagArguments = [GtagCommand, ...unknown[]];
type DataLayerItem = GtagArguments | Record<string, unknown>;

declare global {
  interface Window {
    dataLayer?: DataLayerItem[];
    gtag?: (...args: GtagArguments) => void;
    uetq?: Array<Record<string, unknown>> & { push: (...args: unknown[]) => number };
    clarity?: (...args: unknown[]) => void;
  }
}

const DEFAULT_GA4_MEASUREMENT_ID = 'G-9KHM3KVN5Q';
const DEFAULT_GOOGLE_ADS_ID = 'AW-18162348578';
const DEFAULT_GOOGLE_ADS_CONTACT_CONVERSION_LABEL = '4PthCKTk6q0cEKLkvdRD';
const DEFAULT_GOOGLE_ADS_SIGNUP_CONVERSION_LABEL = 'dFKvCLrn8K0cEKLkvdRD';
const DEFAULT_GOOGLE_ADS_BEGIN_CHECKOUT_CONVERSION_LABEL = 'Y_4DCL3n8K0cEKLkvdRD';
const DEFAULT_GOOGLE_ADS_PURCHASE_CONVERSION_LABEL = 'KEhxCMDn8K0cEKLkvdRD';
const DEFAULT_MICROSOFT_UET_ID = '343251742';

const config = {
  ga4MeasurementId: (import.meta.env.VITE_GA4_MEASUREMENT_ID as string | undefined) || DEFAULT_GA4_MEASUREMENT_ID,
  googleAdsId: (import.meta.env.VITE_GOOGLE_ADS_ID as string | undefined) || DEFAULT_GOOGLE_ADS_ID,
  googleAdsSignupConversionLabel:
    (import.meta.env.VITE_GOOGLE_ADS_SIGNUP_CONVERSION_LABEL as string | undefined) ||
    DEFAULT_GOOGLE_ADS_SIGNUP_CONVERSION_LABEL,
  googleAdsContactConversionLabel:
    (import.meta.env.VITE_GOOGLE_ADS_CONTACT_CONVERSION_LABEL as string | undefined) ||
    DEFAULT_GOOGLE_ADS_CONTACT_CONVERSION_LABEL,
  googleAdsBeginCheckoutConversionLabel:
    (import.meta.env.VITE_GOOGLE_ADS_BEGIN_CHECKOUT_CONVERSION_LABEL as string | undefined) ||
    DEFAULT_GOOGLE_ADS_BEGIN_CHECKOUT_CONVERSION_LABEL,
  googleAdsPurchaseConversionLabel:
    (import.meta.env.VITE_GOOGLE_ADS_PURCHASE_CONVERSION_LABEL as string | undefined) ||
    DEFAULT_GOOGLE_ADS_PURCHASE_CONVERSION_LABEL,
  microsoftUetId: (import.meta.env.VITE_MICROSOFT_UET_ID as string | undefined) || DEFAULT_MICROSOFT_UET_ID,
  clarityProjectId: import.meta.env.VITE_CLARITY_PROJECT_ID as string | undefined,
};

let gtagInitialized = false;
let clarityInitialized = false;
let uetInitialized = false;

function ensureDataLayer(): DataLayerItem[] | undefined {
  if (typeof window === 'undefined') return undefined;

  window.dataLayer = window.dataLayer || [];
  return window.dataLayer;
}

function ensureGtagStub(): void {
  if (typeof window === 'undefined') return;

  const dataLayer = ensureDataLayer();
  window.gtag = window.gtag || function gtag(...args: GtagArguments) {
    dataLayer?.push(args);
  };
}

function updateGoogleConsent(analyticsConsent: boolean, advertisingConsent: boolean): void {
  ensureGtagStub();

  window.gtag?.('consent', 'update', {
    analytics_storage: analyticsConsent ? 'granted' : 'denied',
    ad_storage: advertisingConsent ? 'granted' : 'denied',
    ad_user_data: advertisingConsent ? 'granted' : 'denied',
    ad_personalization: advertisingConsent ? 'granted' : 'denied',
  });
}

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

function sanitizeEventParameters(parameters: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(parameters).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  );
}

function pushDataLayerEvent(eventName: string, parameters: Record<string, unknown> = {}): void {
  const dataLayer = ensureDataLayer();
  if (!dataLayer) return;

  dataLayer.push({
    event: eventName,
    ...sanitizeEventParameters(parameters),
  });
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

  ensureGtagStub();

  window.gtag?.('js', new Date());

  if (loadGa4) {
    window.gtag?.('config', config.ga4MeasurementId!, { send_page_view: false });
  }

  if (loadGads) {
    window.gtag?.('config', config.googleAdsId, { send_page_view: false });
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

  if (!window.uetq) {
    window.uetq = [] as typeof window.uetq;
  }

  appendScript('aifacilitator-uet', 'https://bat.bing.com/bat.js');

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

  // No consent decision yet — GTM keeps Google Consent Mode defaults denied.
  if (!consent) return;

  updateGoogleConsent(consent.analytics, consent.advertising);
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
  const parameters = {
    page_title: title,
    page_location: pageLocation,
    page_path: path,
  };

  if (consent.analytics) {
    pushDataLayerEvent('page_view', parameters);
  }

  if (consent.analytics && hasValue(config.ga4MeasurementId) && window.gtag) {
    window.gtag('event', 'page_view', parameters);
  }

  if (consent.advertising && hasValue(config.googleAdsId) && window.gtag) {
    window.gtag('config', config.googleAdsId, parameters);
  }

  if (consent.advertising && window.uetq) {
    window.uetq.push('event', 'page_view', parameters);
  }
}

function trackGa4Event(eventName: string, parameters: Record<string, unknown> = {}): void {
  const consent = getStoredConsent();
  if (!consent?.analytics) return;
  initializeTracking();

  const sanitizedParameters = sanitizeEventParameters(parameters);

  // Always push a GTM-style event. This keeps events measurable even when GA4 is
  // configured in GTM rather than injected through Vite environment variables.
  pushDataLayerEvent(eventName, sanitizedParameters);

  if (hasValue(config.ga4MeasurementId) && window.gtag) {
    window.gtag('event', eventName, sanitizedParameters);
  }
}

function trackGoogleAdsConversion(label?: string, parameters: Record<string, unknown> = {}): void {
  const consent = getStoredConsent();
  if (!consent?.advertising) return;
  initializeTracking();

  if (!hasValue(config.googleAdsId) || !hasValue(label) || !window.gtag) return;

  window.gtag('event', 'conversion', {
    send_to: `${config.googleAdsId}/${label}`,
    ...sanitizeEventParameters(parameters),
  });
}

function trackMicrosoftEvent(eventName: string, parameters: Record<string, unknown> = {}): void {
  const consent = getStoredConsent();
  if (!consent?.advertising) return;
  if (!window.uetq) return;

  window.uetq.push('event', eventName, {
    event_category: 'acquisition',
    ...sanitizeEventParameters(parameters),
  });
}

function createClientEventId(prefix: string): string {
  const randomValue =
    typeof window !== 'undefined' && window.crypto && 'randomUUID' in window.crypto
      ? window.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return `${prefix}-${randomValue}`;
}

export function trackSignup(method = 'email'): void {
  const parameters = {
    method,
    event_category: 'acquisition',
    event_label: 'account_created',
    lead_source: 'signup',
  };

  trackGa4Event('sign_up', parameters);
  trackGa4Event('generate_lead', parameters);
  trackGoogleAdsConversion(config.googleAdsSignupConversionLabel, parameters);
  trackMicrosoftEvent('sign_up', parameters);
  trackMicrosoftEvent('generate_lead', parameters);
}

export function trackContactLead(source = 'contact_form'): void {
  const eventId = createClientEventId('contact-lead');
  const parameters = {
    event_category: 'acquisition',
    event_label: source,
    lead_source: source,
    event_id: eventId,
    transaction_id: eventId,
  };

  trackGa4Event('contact_form_submit', parameters);
  trackGa4Event('generate_lead', parameters);
  // GA4 already has qualify_lead configured as a key event for this property.
  // Emit it only when this function is called after confirmed contact-form delivery
  // so paid-media optimization receives a clean lead signal rather than page views.
  trackGa4Event('qualify_lead', parameters);
  trackGoogleAdsConversion(config.googleAdsContactConversionLabel, parameters);
  trackMicrosoftEvent('submit_lead_form', parameters);
  trackMicrosoftEvent('contact_form_submit', parameters);
  trackMicrosoftEvent('generate_lead', parameters);
}

export function trackLeadIntent(source: string, destination: string): void {
  const parameters = {
    event_category: 'acquisition',
    event_label: source,
    lead_source: source,
    destination,
  };

  trackGa4Event('generate_lead_intent', parameters);
  trackMicrosoftEvent('generate_lead_intent', parameters);
}

export function trackCtaClick(label: string, destination: string, location = 'public_site'): void {
  const parameters = {
    event_category: 'engagement',
    event_label: label,
    cta_location: location,
    destination,
  };

  trackGa4Event('cta_click', parameters);
  trackGa4Event('select_content', {
    ...parameters,
    content_type: 'cta',
    item_id: label,
  });
  trackMicrosoftEvent('cta_click', parameters);
}

export function trackPricingView(source = 'pricing_page'): void {
  const parameters = {
    event_category: 'acquisition',
    event_label: source,
    source,
  };

  trackGa4Event('view_pricing', parameters);
  trackMicrosoftEvent('view_pricing', parameters);
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
