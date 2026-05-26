export type ParticipantMediaPreferences = {
  cameraEnabled: boolean;
  microphoneEnabled: boolean;
  updatedAt: string;
};

const PARTICIPANT_MEDIA_PREFERENCES_PREFIX = 'participantMediaPreferences';

export const getParticipantMediaPreferencesKey = (conversationId: number | string | null | undefined): string | null => {
  if (conversationId === null || conversationId === undefined || conversationId === '') return null;
  return `${PARTICIPANT_MEDIA_PREFERENCES_PREFIX}:${conversationId}`;
};

const DEFAULT_MEDIA_PREFERENCES: ParticipantMediaPreferences = {
  cameraEnabled: false,
  microphoneEnabled: false,
  updatedAt: '',
};

export const readParticipantMediaPreferences = (
  conversationId: number | string | null | undefined,
): ParticipantMediaPreferences => {
  const key = getParticipantMediaPreferencesKey(conversationId);
  if (!key || typeof window === 'undefined') return DEFAULT_MEDIA_PREFERENCES;

  try {
    const rawValue = window.localStorage.getItem(key);
    if (!rawValue) return DEFAULT_MEDIA_PREFERENCES;
    const parsed = JSON.parse(rawValue) as Partial<ParticipantMediaPreferences>;

    return {
      cameraEnabled: Boolean(parsed.cameraEnabled),
      microphoneEnabled: Boolean(parsed.microphoneEnabled),
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : '',
    };
  } catch (error) {
    console.warn('Unable to read participant media preferences:', error);
    return DEFAULT_MEDIA_PREFERENCES;
  }
};

export const persistParticipantMediaPreferences = (
  conversationId: number | string | null | undefined,
  preferences: Pick<ParticipantMediaPreferences, 'cameraEnabled' | 'microphoneEnabled'>,
): void => {
  const key = getParticipantMediaPreferencesKey(conversationId);
  if (!key || typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(key, JSON.stringify({
      cameraEnabled: preferences.cameraEnabled,
      microphoneEnabled: preferences.microphoneEnabled,
      updatedAt: new Date().toISOString(),
    } satisfies ParticipantMediaPreferences));
  } catch (error) {
    console.warn('Unable to save participant media preferences:', error);
  }
};
