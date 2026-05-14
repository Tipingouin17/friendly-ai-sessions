/**
 * Centralized acquisition and conversion tracking.
 *
 * This module deliberately keeps all marketing tags behind safe wrappers so
 * application code never fails if a third-party script is blocked, delayed, or
 * not configured in the current environment.
 */

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

let initialized = false;
let clarityInitialized = false;

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

function initGtag(): void {
  const primaryGoogleId = hasValue(config.ga4MeasurementId)
    ? config.ga4MeasurementId
    : config.googleAdsId;

  if (!hasValue(primaryGoogleId)) return;

  appendScript('aifacilitator-gtag', `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(primaryGoogleId)}`);

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag(...args: GtagArguments) {
    window.dataLayer?.push(args);
  };

  window.gtag('js', new Date());

  if (hasValue(config.ga4MeasurementId)) {
    window.gtag('config', config.ga4MeasurementId, { send_page_view: false });
  }

  if (hasValue(config.googleAdsId)) {
    window.gtag('config', config.googleAdsId, { send_page_view: false });
  }
}

function initClarity(): void {
  if (clarityInitialized || !hasValue(config.clarityProjectId) || typeof window === 'undefined') return;

  clarityInitialized = true;
  window.clarity = window.clarity || function clarity(...args: unknown[]) {
    (window.clarity as unknown[]).push(args);
  } as Window['clarity'];

  appendScript('aifacilitator-clarity', `https://www.clarity.ms/tag/${encodeURIComponent(config.clarityProjectId)}`);
}

export function initializeTracking(): void {
  if (initialized || typeof window === 'undefined') return;

  initialized = true;
  initGtag();
  initClarity();
}

export function trackPageView(path: string, title = document.title): void {
  initializeTracking();

  const pageLocation = `${window.location.origin}${path}`;

  if (hasValue(config.ga4MeasurementId) && window.gtag) {
    window.gtag('event', 'page_view', {
      page_title: title,
      page_location: pageLocation,
      page_path: path,
    });
  }

  if (hasValue(config.googleAdsId) && window.gtag) {
    window.gtag('config', config.googleAdsId, {
      page_title: title,
      page_location: pageLocation,
      page_path: path,
    });
  }

  if (window.uetq) {
    window.uetq.push('event', 'page_view', {
      page_path: path,
      page_location: pageLocation,
    });
  }
}

function trackGa4Event(eventName: string, parameters: Record<string, unknown> = {}): void {
  initializeTracking();

  if (hasValue(config.ga4MeasurementId) && window.gtag) {
    window.gtag('event', eventName, parameters);
  }
}

function trackGoogleAdsConversion(label?: string, parameters: Record<string, unknown> = {}): void {
  initializeTracking();

  if (!hasValue(config.googleAdsId) || !hasValue(label) || !window.gtag) return;

  window.gtag('event', 'conversion', {
    send_to: `${config.googleAdsId}/${label}`,
    ...parameters,
  });
}

function trackMicrosoftEvent(eventName: string, parameters: Record<string, unknown> = {}): void {
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

export function trackBeginCheckout(planName?: string, value?: number, currency = 'USD'): void {
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

export function trackPurchase(transactionId: string, value?: number, currency = 'USD'): void {
  const parameters = {
    transaction_id: transactionId,
    currency,
    value,
  };

  trackGa4Event('purchase', parameters);
  trackGoogleAdsConversion(config.googleAdsPurchaseConversionLabel, parameters);
  trackMicrosoftEvent('purchase', parameters);
}
