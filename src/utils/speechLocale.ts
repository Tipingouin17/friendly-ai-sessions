const LANGUAGE_TO_SPEECH_LOCALE: Record<string, string> = {
  en: 'en-US',
  english: 'en-US',
  fr: 'fr-FR',
  french: 'fr-FR',
  français: 'fr-FR',
  francais: 'fr-FR',
  nl: 'nl-NL',
  dutch: 'nl-NL',
  nederlands: 'nl-NL',
  de: 'de-DE',
  german: 'de-DE',
  deutsch: 'de-DE',
  es: 'es-ES',
  spanish: 'es-ES',
  español: 'es-ES',
  espanol: 'es-ES',
  it: 'it-IT',
  italian: 'it-IT',
  italiano: 'it-IT',
  pt: 'pt-PT',
  portuguese: 'pt-PT',
  português: 'pt-PT',
  portugues: 'pt-PT',
};

/**
 * Converts a stored conversation language value into a browser Speech API locale.
 * The database can contain ISO codes, display names, or already-normalized BCP-47
 * locales depending on the creation path; this helper keeps voice features generic.
 */
export const getSpeechLocale = (language?: string | null): string => {
  if (!language || typeof language !== 'string') return 'en-US';

  const normalized = language.trim().toLowerCase().replace(/_/g, '-');
  if (!normalized) return 'en-US';

  if (/^[a-z]{2}-[a-z]{2}$/i.test(normalized)) {
    const [primary, region] = normalized.split('-');
    return `${primary.toLowerCase()}-${region.toUpperCase()}`;
  }

  return LANGUAGE_TO_SPEECH_LOCALE[normalized] || LANGUAGE_TO_SPEECH_LOCALE[normalized.split('-')[0]] || 'en-US';
};
