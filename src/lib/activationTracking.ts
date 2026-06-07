import { getStoredConsent } from "@/components/CookieBanner";
import { api, type ActivationEventName, type ActivationEventPayload } from "@/lib/api";
import { getStoredAttribution } from "@/lib/tracking";

const ACTIVATION_ANONYMOUS_ID_KEY = "aifacilitator_activation_anonymous_id_v1";
const ACTIVATION_SESSION_ID_KEY = "aifacilitator_activation_session_id_v1";

function createClientId(prefix: string): string {
  const randomValue =
    typeof window !== "undefined" && window.crypto && "randomUUID" in window.crypto
      ? window.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return `${prefix}-${randomValue}`;
}

function readOrCreateStorageValue(key: string, prefix: string): string | undefined {
  if (typeof window === "undefined") return undefined;

  try {
    const existing = window.localStorage.getItem(key);
    if (existing) return existing;

    const created = createClientId(prefix);
    window.localStorage.setItem(key, created);
    return created;
  } catch {
    return createClientId(prefix);
  }
}

export function getActivationAnonymousId(): string | undefined {
  return readOrCreateStorageValue(ACTIVATION_ANONYMOUS_ID_KEY, "anon");
}

export function getActivationSessionId(): string | undefined {
  return readOrCreateStorageValue(ACTIVATION_SESSION_ID_KEY, "activation");
}

function buildActivationPayload(
  eventName: ActivationEventName,
  eventProperties: Record<string, unknown> = {},
): ActivationEventPayload {
  const consent = getStoredConsent();
  const attribution = getStoredAttribution();

  return {
    event_name: eventName,
    activation_step: typeof eventProperties.activation_step === "string" ? eventProperties.activation_step : eventName,
    anonymous_id: getActivationAnonymousId(),
    activation_session_id: getActivationSessionId(),
    page_url: typeof window !== "undefined" ? window.location.href : undefined,
    referrer: typeof document !== "undefined" ? document.referrer : undefined,
    attribution: attribution ? { ...attribution } : null,
    consent: consent
      ? {
          analytics: consent.analytics,
          advertising: consent.advertising,
        }
      : null,
    event_properties: eventProperties,
    first_session_id: (eventProperties.first_session_id as number | string | null | undefined) ??
      (eventProperties.session_id as number | string | null | undefined) ??
      null,
  };
}

export async function recordActivationEvent(
  eventName: ActivationEventName,
  eventProperties: Record<string, unknown> = {},
): Promise<void> {
  try {
    const { error } = await api.activation.recordEvent(buildActivationPayload(eventName, eventProperties));
    if (error && import.meta.env.DEV) {
      console.warn("Activation event was not recorded", eventName, error);
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn("Activation event recording failed", eventName, error);
    }
  }
}

export function recordActivationEventBeacon(
  eventName: ActivationEventName,
  eventProperties: Record<string, unknown> = {},
): void {
  void recordActivationEvent(eventName, eventProperties);
}
