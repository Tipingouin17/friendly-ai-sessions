/**
 * Centralized acquisition and conversion tracking — GDPR-compliant.
 *
 * Google Analytics, Google Ads, Google Tag Manager, and Clarity scripts are only
 * loaded when the user has given explicit consent via the CookieBanner component.
 * Microsoft UET is loaded in Consent Mode with ad storage denied by default, then
 * updated to granted only after advertising consent. Consent is stored in
 * localStorage under the key "cookie_consent_v1" (see src/components/CookieBanner.tsx).
 *
 * This module deliberately keeps all marketing tags behind safe wrappers so
 * application code never fails if a third-party script is blocked, delayed, or
 * not configured in the current environment.
 */

import { getStoredConsent } from "@/components/CookieBanner";

type GtagCommand = 'js' | 'config' | 'event' | 'set' | 'consent';
type GtagArguments = [GtagCommand, ...unknown[]];
type DataLayerItem = GtagArguments | Record<string, unknown>;
type UetConsentState = 'granted' | 'denied';

export interface AcquisitionAttributionSnapshot {
  first_seen_at: string;
  last_seen_at: string;
  landing_page: string;
  current_page: string;
  referrer: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  gclid?: string;
  gbraid?: string;
  wbraid?: string;
  msclkid?: string;
  fbclid?: string;
  consent_analytics?: boolean;
  consent_advertising?: boolean;
}

export type GoogleAdsEnhancedConversionUserData = {
  /** Plain email is accepted by Google tag and hashed by Google before matching. */
  email?: string | null;
};

declare global {
  interface Window {
    dataLayer?: DataLayerItem[];
    gtag?: (...args: GtagArguments) => void;
    uetq?: unknown[] | { push?: (...args: unknown[]) => unknown };
    clarity?: (...args: unknown[]) => void;
  }
}

const DEFAULT_GA4_MEASUREMENT_ID = 'G-9KHM3KVN5Q';
const DEFAULT_GOOGLE_ADS_ID = 'AW-18162348578';
const DEFAULT_GOOGLE_ADS_CONTACT_CONVERSION_LABEL = '4PthCKTk6q0cEKLkvdRD';
const DEFAULT_GOOGLE_ADS_SIGNUP_CONVERSION_LABEL = 'dFKvCLrn8K0cEKLkvdRD';
const DEFAULT_GOOGLE_ADS_BEGIN_CHECKOUT_CONVERSION_LABEL = 'Y_4DCL3n8K0cEKLkvdRD';
const DEFAULT_GOOGLE_ADS_PURCHASE_CONVERSION_LABEL = 'KEhxCMDn8K0cEKLkvdRD';
const DEFAULT_GOOGLE_ADS_SESSION_CREATED_CONVERSION_LABEL = 'wPD4CNXXj-IcEKLkvdRD';
const DEFAULT_GTM_CONTAINER_ID = 'GTM-NK8ZJFW2';
const DEFAULT_MICROSOFT_UET_ID = '343251742';
const ATTRIBUTION_STORAGE_KEY = 'aifacilitator_acquisition_attribution_v1';
const ATTRIBUTION_PARAM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'gbraid', 'wbraid', 'msclkid', 'fbclid'] as const;
const UET_DISABLED_PATHS = ['/session', '/join-session', '/admin'];

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
  googleAdsSessionCreatedConversionLabel:
    (import.meta.env.VITE_GOOGLE_ADS_SESSION_CREATED_CONVERSION_LABEL as string | undefined) ||
    DEFAULT_GOOGLE_ADS_SESSION_CREATED_CONVERSION_LABEL,
  gtmContainerId: (import.meta.env.VITE_GTM_CONTAINER_ID as string | undefined) || DEFAULT_GTM_CONTAINER_ID,
  microsoftUetId: (import.meta.env.VITE_MICROSOFT_UET_ID as string | undefined) || DEFAULT_MICROSOFT_UET_ID,
  clarityProjectId: import.meta.env.VITE_CLARITY_PROJECT_ID as string | undefined,
};

let gtagInitialized = false;
let gtmInitialized = false;
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

function updateMicrosoftConsent(advertisingConsent: boolean): void {
  if (typeof window === 'undefined') return;

  window.uetq = window.uetq || [];
  window.uetq.push?.('consent', 'update', {
    ad_storage: (advertisingConsent ? 'granted' : 'denied') satisfies UetConsentState,
  });
}

function hasValue(value?: string): value is string {
  return Boolean(value && value.trim().length > 0 && !value.includes('your_'));
}

function isUetDisabledPath(): boolean {
  if (typeof window === 'undefined') return true;
  return UET_DISABLED_PATHS.some(path => window.location.pathname.startsWith(path));
}

function appendScript(id: string, src: string, onload?: () => void): void {
  if (typeof document === 'undefined') return;
  const existing = document.getElementById(id) as HTMLScriptElement | null;
  if (existing) {
    onload?.();
    return;
  }

  const script = document.createElement('script');
  script.id = id;
  script.async = true;
  script.src = src;
  if (onload) script.addEventListener('load', onload, { once: true });
  document.head.appendChild(script);
}

function runAfterInitialRender(callback: () => void): void {
  if (typeof window === 'undefined') return;

  const run = () => {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(callback, { timeout: 2500 });
      return;
    }

    window.setTimeout(callback, 2000);
  };

  if (document.readyState === 'complete') {
    run();
    return;
  }

  window.addEventListener('load', run, { once: true });
}

/** Load GTM only after a consent decision and after the initial render path. */
function initGtm(analyticsConsent: boolean, advertisingConsent: boolean): void {
  if (gtmInitialized || (!analyticsConsent && !advertisingConsent) || !hasValue(config.gtmContainerId)) return;

  gtmInitialized = true;
  const dataLayer = ensureDataLayer();
  dataLayer?.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });

  runAfterInitialRender(() => {
    appendScript(
      'aifacilitator-gtm',
      `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(config.gtmContainerId)}`,
    );
  });
}

function readStoredAttribution(): AcquisitionAttributionSnapshot | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(ATTRIBUTION_STORAGE_KEY);
    return raw ? JSON.parse(raw) as AcquisitionAttributionSnapshot : null;
  } catch {
    return null;
  }
}

function writeStoredAttribution(snapshot: AcquisitionAttributionSnapshot): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Ignore storage failures caused by private mode, quota limits, or disabled storage.
  }
}

export function captureAcquisitionAttribution(): AcquisitionAttributionSnapshot | null {
  if (typeof window === 'undefined') return null;

  const url = new URL(window.location.href);
  const params = url.searchParams;
  const foundParams = Object.fromEntries(
    ATTRIBUTION_PARAM_KEYS
      .map((key) => [key, params.get(key) || undefined] as const)
      .filter(([, value]) => Boolean(value)),
  ) as Partial<AcquisitionAttributionSnapshot>;
  const existing = readStoredAttribution();
  const now = new Date().toISOString();
  const consent = getStoredConsent();
  const hasMarketingParams = Object.keys(foundParams).length > 0;

  if (!existing && !hasMarketingParams && !document.referrer) return null;

  const snapshot: AcquisitionAttributionSnapshot = {
    ...(existing || {}),
    ...foundParams,
    first_seen_at: existing?.first_seen_at || now,
    last_seen_at: now,
    landing_page: existing?.landing_page || window.location.href,
    current_page: window.location.href,
    referrer: existing?.referrer || document.referrer || '',
    consent_analytics: consent?.analytics,
    consent_advertising: consent?.advertising,
  };

  writeStoredAttribution(snapshot);
  return snapshot;
}

export function getStoredAttribution(): AcquisitionAttributionSnapshot | null {
  return captureAcquisitionAttribution() || readStoredAttribution();
}

function getAttributionEventParameters(): Record<string, unknown> {
  const attribution = getStoredAttribution();
  if (!attribution) return {};

  return {
    utm_source: attribution.utm_source,
    utm_medium: attribution.utm_medium,
    utm_campaign: attribution.utm_campaign,
    utm_term: attribution.utm_term,
    utm_content: attribution.utm_content,
    gclid: attribution.gclid,
    gbraid: attribution.gbraid,
    wbraid: attribution.wbraid,
    msclkid: attribution.msclkid,
    landing_page: attribution.landing_page,
    first_referrer: attribution.referrer,
  };
}

function sanitizeEventParameters(parameters: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(parameters).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  );
}

function normalizeEmailForEnhancedConversions(email?: string | null): string | undefined {
  const normalizedEmail = email?.trim().toLowerCase();
  if (!normalizedEmail) return undefined;

  // Avoid sending malformed user-provided data to the Google tag.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) return undefined;

  return normalizedEmail;
}

function getEnhancedConversionUserData(
  userData?: GoogleAdsEnhancedConversionUserData,
): Record<string, string> | undefined {
  const email = normalizeEmailForEnhancedConversions(userData?.email);

  if (!email) return undefined;

  return { email };
}

function setGoogleAdsEnhancedConversionUserData(userData?: GoogleAdsEnhancedConversionUserData): void {
  const enhancedConversionUserData = getEnhancedConversionUserData(userData);
  if (!enhancedConversionUserData || !window.gtag) return;

  window.gtag('set', 'user_data', enhancedConversionUserData);
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
  if (clarityInitialized || !analyticsConsent || !hasValue(config.clarityProjectId) || typeof window === 'undefined' || typeof document === 'undefined') return;

  const existingClarityScript = document.querySelector('script[src*="clarity.ms/tag/"]');
  if (existingClarityScript) {
    clarityInitialized = true;
    return;
  }

  clarityInitialized = true;
  window.clarity = window.clarity || function clarity(...args: unknown[]) {
    const clarityFunction = window.clarity as Window['clarity'] & { q?: unknown[] };
    (clarityFunction.q = clarityFunction.q || []).push(args);
  } as Window['clarity'];

  appendScript('aifacilitator-clarity', `https://www.clarity.ms/tag/${encodeURIComponent(config.clarityProjectId)}`);
}

/**
 * Load Microsoft UET in Consent Mode on allowed marketing pages.
 *
 * UET must be present for Microsoft Advertising to verify the tag, but optional
 * advertising storage remains denied until the visitor explicitly grants
 * advertising consent.
 */
function initUet(advertisingConsent: boolean): void {
  if (uetInitialized || !hasValue(config.microsoftUetId) || typeof window === 'undefined' || typeof document === 'undefined' || isUetDisabledPath()) return;

  if (document.getElementById('aifacilitator-uet-config') || document.getElementById('microsoft-uet-script')) {
    uetInitialized = true;
    return;
  }

  uetInitialized = true;

  window.uetq = window.uetq || [];
  window.uetq.push?.('consent', 'default', { ad_storage: 'denied' });
  updateMicrosoftConsent(advertisingConsent);

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

  captureAcquisitionAttribution();

  const consent = getStoredConsent();
  const advertisingConsent = Boolean(consent?.advertising);

  updateMicrosoftConsent(advertisingConsent);
  initUet(advertisingConsent);

  // No consent decision yet — Google/GTM/Clarity stay unloaded while Microsoft UET
  // remains in default-denied Consent Mode.
  if (!consent) return;

  updateGoogleConsent(consent.analytics, consent.advertising);
  initGtag(consent.analytics, consent.advertising);
  initGtm(consent.analytics, consent.advertising);
  initClarity(consent.analytics);
}

/** Re-initialize tracking after consent is updated (called by cookie-consent-updated event). */
export function reinitializeTracking(): void {
  // Reset flags so scripts can be loaded if consent was just granted
  gtagInitialized = false;
  gtmInitialized = false;
  clarityInitialized = false;
  uetInitialized = false;
  initializeTracking();
}

export function trackPageView(path: string, title = document.title): void {
  initializeTracking();

  const consent = getStoredConsent();
  if (!consent) return;

  const pageLocation = `${window.location.origin}${path}`;
  captureAcquisitionAttribution();

  const parameters = {
    page_title: title,
    page_location: pageLocation,
    page_path: path,
    ...getAttributionEventParameters(),
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

  if (consent.advertising && window.uetq && !isUetDisabledPath()) {
    window.uetq.push('event', 'page_view', parameters);
  }
}



export function trackGa4Event(eventName: string, parameters: Record<string, unknown> = {}): void {
  const consent = getStoredConsent();
  if (!consent?.analytics) return;
  initializeTracking();

  const sanitizedParameters = sanitizeEventParameters({
    ...getAttributionEventParameters(),
    ...parameters,
  });

  // Always push a GTM-style event. This keeps events measurable even when GA4 is
  // configured in GTM rather than injected through Vite environment variables.
  pushDataLayerEvent(eventName, sanitizedParameters);

  if (hasValue(config.ga4MeasurementId) && window.gtag) {
    window.gtag("event", eventName, sanitizedParameters);
  }
}

export function trackMicrosoftEvent(eventName: string, parameters: Record<string, unknown> = {}): void {
  const consent = getStoredConsent();
  if (!consent?.advertising || isUetDisabledPath()) return;
  initializeTracking();

  if (window.uetq) {
    window.uetq.push("event", eventName, sanitizeEventParameters({
      ...getAttributionEventParameters(),
      ...parameters,
    }));
  }
}




export function trackGoogleAdsConversion(
  label?: string,
  parameters: Record<string, unknown> = {},
  userData?: GoogleAdsEnhancedConversionUserData,
): void {
  const consent = getStoredConsent();
  if (!consent?.advertising) return;
  initializeTracking();

  if (!hasValue(config.googleAdsId) || !hasValue(label) || !window.gtag) return;

  setGoogleAdsEnhancedConversionUserData(userData);

  window.gtag('event', 'conversion', {
    send_to: `${config.googleAdsId}/${label}`,
    ...sanitizeEventParameters({
      ...getAttributionEventParameters(),
      ...parameters,
    }),
  });
}



function createClientEventId(prefix: string): string {
  const randomValue =
    typeof window !== 'undefined' && window.crypto && 'randomUUID' in window.crypto
      ? window.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return `${prefix}-${randomValue}`;
}

export function trackSignupStart(method = 'email'): void {
  const parameters = {
    method,
    event_category: 'acquisition',
    event_label: 'signup_form_submitted',
    funnel_step: 'signup_start',
    lead_source: 'signup',
  };

  trackGa4Event('signup_start', parameters);
  trackMicrosoftEvent('signup_start', parameters);
}

export function trackSignup(method = 'email', userData?: GoogleAdsEnhancedConversionUserData): void {
  const parameters = {
    method,
    event_category: 'acquisition',
    event_label: 'account_created',
    funnel_step: 'signup_complete',
    lead_source: 'signup',
  };

  trackGa4Event('sign_up', parameters);
  trackGa4Event('signup_complete', parameters);
  trackGa4Event('generate_lead', parameters);
  trackGoogleAdsConversion(config.googleAdsSignupConversionLabel, parameters, userData);
  // Microsoft Ads custom goal requested by the brief: window.uetq.push('event', 'signup', ...)
  trackMicrosoftEvent('signup', parameters);
  trackMicrosoftEvent('sign_up', parameters);
  trackMicrosoftEvent('signup_complete', parameters);
  trackMicrosoftEvent('generate_lead', parameters);
}

export function trackActivationSignupSubmitted(method = 'email'): void {
  const parameters = {
    method,
    event_category: 'activation',
    event_label: 'signup_submitted',
    activation_step: 'signup_submitted',
  };

  trackGa4Event('activation_signup_submitted', parameters);
  trackMicrosoftEvent('activation_signup_submitted', parameters);
}

export function trackActivationEmailVerified(source = 'email_link'): void {
  const parameters = {
    event_category: 'activation',
    event_label: source,
    activation_step: 'email_verified',
    source,
  };

  trackGa4Event('activation_email_verified', parameters);
  trackMicrosoftEvent('activation_email_verified', parameters);
}

export function trackActivationDemoViewed(source = 'post_verification'): void {
  const parameters = {
    event_category: 'activation',
    event_label: source,
    activation_step: 'demo_viewed',
    source,
  };

  trackGa4Event('activation_demo_viewed', parameters);
  trackMicrosoftEvent('activation_demo_viewed', parameters);
}

export function trackActivationDemoStarted(source = 'onboarding_demo'): void {
  const parameters = {
    event_category: 'activation',
    event_label: source,
    activation_step: 'demo_started',
    source,
  };

  trackGa4Event('activation_demo_started', parameters);
  trackMicrosoftEvent('activation_demo_started', parameters);
}

export function trackInviteParticipantsIntent(source = 'onboarding_demo'): void {
  const parameters = {
    event_category: 'activation',
    event_label: source,
    activation_step: 'invite_participants_intent',
    source,
  };

  trackGa4Event('invite_participants_intent', parameters);
  trackMicrosoftEvent('invite_participants_intent', parameters);
}

/** Record completion of the guided solo-demo setup after a demo workshop is created. */
export function trackActivationDemoCompleted(source = 'onboarding_demo_workshop_created'): void {
  const parameters = {
    event_category: 'activation',
    event_label: source,
    activation_step: 'demo_completed',
    source,
  };

  trackGa4Event('activation_demo_completed', parameters);
  trackMicrosoftEvent('activation_demo_completed', parameters);
}

export function trackFirstRealSessionStarted(source = 'session_start'): void {
  const parameters = {
    event_category: 'activation',
    event_label: source,
    activation_step: 'first_real_session_started',
    source,
  };

  trackGa4Event('first_real_session_started', parameters);
  trackMicrosoftEvent('first_real_session_started', parameters);
}

export function trackSessionCreated(parameters: Record<string, unknown>): void {
  const conversionParameters = {
    event_category: 'activation',
    event_label: 'session_created',
    funnel_step: 'session_created',
    ...parameters,
  };

  trackGa4Event('session_created', conversionParameters);
  trackGa4Event('first_workshop_created', {
    ...conversionParameters,
    activation_step: 'first_workshop_created',
  });
  if (config.googleAdsSessionCreatedConversionLabel) {
    trackGoogleAdsConversion(config.googleAdsSessionCreatedConversionLabel, conversionParameters);
  }
  trackMicrosoftEvent('session_created', conversionParameters);
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

export function trackBeginCheckout(
  planName?: string,
  value?: number,
  currency = 'EUR',
  userData?: GoogleAdsEnhancedConversionUserData,
): void {
  const parameters = {
    event_category: 'monetization',
    event_label: planName || 'pricing_checkout',
    currency,
    value,
  };

  trackGa4Event('begin_checkout', parameters);
  trackGoogleAdsConversion(config.googleAdsBeginCheckoutConversionLabel, parameters, userData);
  trackMicrosoftEvent('begin_checkout', parameters);
}

export function trackPurchase(
  transactionId: string,
  value?: number,
  currency = 'EUR',
  userData?: GoogleAdsEnhancedConversionUserData,
): void {
  const parameters = {
    transaction_id: transactionId,
    currency,
    value,
  };

  trackGa4Event('purchase', parameters);
  trackGoogleAdsConversion(config.googleAdsPurchaseConversionLabel, parameters, userData);
  trackMicrosoftEvent('purchase', parameters);
}
