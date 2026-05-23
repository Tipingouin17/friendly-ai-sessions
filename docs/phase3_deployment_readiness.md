# Phase 3 Deployment Readiness Checklist

**Author:** Manus AI

This checklist documents the production-readiness contract for the Phase 3 speech, avatar, TTS, lip-sync, and deeper analytics stack. It is intended to be reviewed before promoting the `dev` branch to a production deployment.

## Runtime Feature Gates

Phase 3 runtime behavior must be controlled by the admin configuration record and must not depend on hard-coded frontend assumptions. Live participant sessions load the normalized Phase 3 settings before enabling microphone capture, facilitator voice playback, avatar/lip-sync metadata, or analytics persistence.

| Setting | Deployment expectation | Runtime behavior |
|---|---|---|
| `speech_stack_enabled` | Enabled only when the deployment is allowed to request microphone access. | Gates browser speech recognition and speech-derived stream chunks. |
| `tts_avatar_enabled` | Enabled only when voice playback and avatar embodiment are desired for participants. | Gates facilitator speech synthesis and runtime avatar speaking states. |
| `tts_lip_sync_enabled` | Enabled only when lip-sync markers should be generated or consumed. | Controls estimated lip-sync marker generation in the browser fallback and the shared provider contract. |
| `tts_default_voice_id` | Optional; should match an available browser or provider voice identifier. | Selects the closest available browser voice when using the browser fallback. |
| `facilitation_analytics_enabled` | Enabled only when snapshot persistence is acceptable for the deployment. | Gates speech/TTS event persistence and facilitation analytics snapshots. |

## Provider Configuration Contract

The current deployment-safe default remains the browser MVP fallback. Provider-backed STT, TTS, avatar, and analytics endpoints can be introduced behind the same adapter descriptors without changing participant-session UI contracts.

| Environment variable | Purpose | Safe default |
|---|---|---|
| `VITE_PHASE3_STT_PROVIDER` | Selects browser, server, external, or disabled STT mode. | `browser` |
| `VITE_PHASE3_TTS_PROVIDER` | Selects browser, server, external, or disabled TTS mode. | `browser` |
| `VITE_PHASE3_AVATAR_PROVIDER` | Selects browser, server, external, or disabled avatar mode. | `browser` |
| `VITE_PHASE3_LIPSYNC_PROVIDER` | Selects the lip-sync marker source. | `browser_estimated` |
| `VITE_PHASE3_STT_ENDPOINT` | Optional public frontend endpoint for a future STT adapter. | blank |
| `VITE_PHASE3_TTS_ENDPOINT` | Optional public frontend endpoint for a future TTS adapter. | blank |
| `VITE_PHASE3_AVATAR_ENDPOINT` | Optional public frontend endpoint for a future avatar adapter. | blank |
| `VITE_PHASE3_ANALYTICS_ENDPOINT` | Optional public frontend endpoint for scheduled analytics rollups. | blank |
| `PHASE3_STT_API_KEY` | Backend-only STT secret for Railway-side providers. | blank |
| `PHASE3_TTS_API_KEY` | Backend-only TTS secret for Railway-side providers. | blank |
| `PHASE3_AVATAR_API_KEY` | Backend-only avatar secret for Railway-side providers. | blank |
| `PHASE3_ANALYTICS_SNAPSHOT_INTERVAL_SECONDS` | Backend-side scheduled snapshot cadence. | `300` |

## Deployment Validation Commands

The branch should pass the focused Phase 3 regression suite, the facilitator runtime regression suite, the production build, and targeted lint on changed Phase 3 files before promotion.

| Command | Purpose |
|---|---|
| `pnpm test:phase3-hardening` | Verifies provider descriptors, settings normalization, runtime gating, analytics exports, and environment documentation. |
| `pnpm test:facilitator-runtime` | Runs the existing facilitator runtime regression suite plus Phase 3 hardening checks. |
| `pnpm build` | Validates TypeScript compilation and production bundling. |
| Targeted ESLint on changed Phase 3 files | Ensures this deployment slice is error-free without conflating it with unrelated repository-wide lint debt. |

## Manual Smoke Test Path

A release reviewer should create or open a participant session on the deployment, confirm that the microphone button is disabled when `speech_stack_enabled` is off, enable the setting, grant browser microphone permission, speak a short response, and verify that a final transcript appears as participant input. The reviewer should then confirm that facilitator responses trigger voice playback only when `tts_avatar_enabled` is on and that the session report/admin analytics pages show the deeper facilitation analytics surfaces when analytics persistence is enabled.

## Rollback Expectations

If browser speech, TTS, or analytics behavior causes deployment issues, the admin settings can disable Phase 3 features without redeploying code. If provider-backed endpoints are introduced later and fail health checks, the provider mode should be returned to `browser` or `disabled` while preserving the same database tables and UI contracts.
