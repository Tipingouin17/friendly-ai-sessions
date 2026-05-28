import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Phase3RuntimeSettings } from '@/types/facilitator';

export const DEFAULT_PHASE3_RUNTIME_SETTINGS: Required<Phase3RuntimeSettings> = {
  speech_stack_enabled: true,
  speech_default_language: 'en-US',
  tts_avatar_enabled: true,
  tts_default_voice_id: null,
  tts_lip_sync_enabled: true,
  facilitation_analytics_enabled: true,
};

interface ConfigurationRow extends Phase3RuntimeSettings {
  id?: number;
  created_at?: string;
  updated_at?: string;
}

export function normalizePhase3RuntimeSettings(
  row?: Phase3RuntimeSettings | null,
  conversationLanguage?: string | null
): Required<Phase3RuntimeSettings> {
  return {
    speech_stack_enabled: row?.speech_stack_enabled ?? DEFAULT_PHASE3_RUNTIME_SETTINGS.speech_stack_enabled,
    speech_default_language:
      row?.speech_default_language || conversationLanguage || DEFAULT_PHASE3_RUNTIME_SETTINGS.speech_default_language,
    tts_avatar_enabled: row?.tts_avatar_enabled ?? DEFAULT_PHASE3_RUNTIME_SETTINGS.tts_avatar_enabled,
    tts_default_voice_id: row?.tts_default_voice_id ?? DEFAULT_PHASE3_RUNTIME_SETTINGS.tts_default_voice_id,
    tts_lip_sync_enabled: row?.tts_lip_sync_enabled ?? DEFAULT_PHASE3_RUNTIME_SETTINGS.tts_lip_sync_enabled,
    facilitation_analytics_enabled:
      row?.facilitation_analytics_enabled ?? DEFAULT_PHASE3_RUNTIME_SETTINGS.facilitation_analytics_enabled,
  };
}

export function usePhase3RuntimeSettings(conversationLanguage?: string | null) {
  return useQuery<Required<Phase3RuntimeSettings>, Error>({
    queryKey: ['phase3-runtime-settings', conversationLanguage ?? 'default'],
    queryFn: async () => {
      const { data, error } = await api
        .from<ConfigurationRow>('configurations')
        .select('speech_stack_enabled,speech_default_language,tts_avatar_enabled,tts_default_voice_id,tts_lip_sync_enabled,facilitation_analytics_enabled')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn('[usePhase3RuntimeSettings] Falling back to defaults:', error.message);
        return normalizePhase3RuntimeSettings(null, conversationLanguage);
      }

      return normalizePhase3RuntimeSettings(data, conversationLanguage);
    },
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    placeholderData: normalizePhase3RuntimeSettings(null, conversationLanguage),
  });
}
