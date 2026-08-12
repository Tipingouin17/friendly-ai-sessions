import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const root = process.cwd();

function loadTsExports(relativePath) {
  const absolutePath = path.join(root, relativePath);
  const source = fs.readFileSync(absolutePath, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;

  const exports = {};
  const context = vm.createContext({
    exports,
    module: { exports },
    require: (specifier) => {
      throw new Error(`Unexpected runtime import while testing ${relativePath}: ${specifier}`);
    },
    console,
  });
  vm.runInContext(output, context, { filename: relativePath });
  return context.module.exports;
}

const providerAdapters = loadTsExports('src/services/facilitator/phase3ProviderAdapters.ts');

const markers = providerAdapters.estimateLipSyncMarkers('Alpha rhythm sync', true);
assert.equal(markers.length, 3, 'lip-sync marker estimation should create one bounded marker per word');
assert.equal(
  providerAdapters.estimateLipSyncMarkers('Alpha rhythm sync', false).length,
  0,
  'lip-sync marker estimation should respect disabled lip-sync settings'
);

const synthesis = providerAdapters.buildBrowserTtsSynthesisResult({
  text: 'Hello team',
  voiceId: 'voice-a',
  lipSyncEnabled: true,
  metadata: { messageId: 'm-1' },
});
assert.equal(synthesis.provider, 'browser_speech_synthesis');
assert.equal(synthesis.status, 'queued');
assert.equal(synthesis.voiceId, 'voice-a');
assert.equal(synthesis.metadata.providerMode, 'browser_mvp');
assert.ok(synthesis.audioDurationMs >= 700, 'browser fallback should estimate a usable duration');
assert.ok(synthesis.lipSyncMarkers.length > 0, 'browser fallback should expose estimated lip-sync markers when enabled');

const cue = providerAdapters.buildAvatarPlaybackCue(synthesis);
assert.equal(cue.avatarState, 'speaking');
assert.equal(cue.intensity, 'high');
assert.ok(cue.lipSyncMarkers.length > 0, 'avatar cue should carry lip-sync markers forward');

const disabledPlan = providerAdapters.buildPhase3RuntimeAdapterPlan({
  speechStackEnabled: false,
  ttsAvatarEnabled: false,
  lipSyncEnabled: false,
  analyticsEnabled: false,
});
assert.equal(disabledPlan.stt.status, 'disabled');
assert.equal(disabledPlan.tts.status, 'disabled');
assert.equal(disabledPlan.avatar.status, 'disabled');
assert.equal(disabledPlan.analytics.status, 'disabled');
assert.equal(disabledPlan.snapshotSchedule.enabled, false);
assert.equal(disabledPlan.snapshotSchedule.cadence, 'manual');
assert.equal(disabledPlan.avatar.capabilities.length, 0, 'disabled avatar provider should not advertise active capabilities');

const providerPlan = providerAdapters.buildPhase3RuntimeAdapterPlan({
  speechStackEnabled: true,
  ttsAvatarEnabled: true,
  lipSyncEnabled: true,
  analyticsEnabled: true,
  providerConfig: {
    sttProvider: 'server',
    ttsProvider: 'server',
    avatarProvider: 'external',
    sttEndpoint: 'https://stt.example.test/stream',
    ttsEndpoint: 'https://tts.example.test/synthesize',
    avatarEndpoint: 'https://avatar.example.test/render',
    analyticsEndpoint: 'https://analytics.example.test/snapshots',
    snapshotIntervalSeconds: 300,
  },
});
assert.equal(providerPlan.stt.status, 'available', 'configured provider STT should be deployment-available');
assert.equal(providerPlan.stt.kind, 'server');
assert.equal(providerPlan.tts.status, 'available', 'configured provider TTS should be deployment-available');
assert.equal(providerPlan.avatar.kind, 'external');
assert.equal(providerPlan.analytics.kind, 'server');
assert.equal(providerPlan.snapshotSchedule.cadence, 'interval');
assert.equal(providerPlan.snapshotSchedule.intervalSeconds, 300);

const unconfiguredProviderPlan = providerAdapters.buildPhase3RuntimeAdapterPlan({
  speechStackEnabled: true,
  providerConfig: { sttProvider: 'server' },
});
assert.equal(unconfiguredProviderPlan.stt.status, 'unconfigured', 'server provider without endpoint should surface deployment misconfiguration');

const runtimeSettingsSource = fs.readFileSync(
  path.join(root, 'src/hooks/facilitator/usePhase3RuntimeSettings.ts'),
  'utf8'
);
assert.match(runtimeSettingsSource, /export function normalizePhase3RuntimeSettings/, 'runtime settings should export a pure normalizer for testability');
assert.match(runtimeSettingsSource, /row\?\.speech_stack_enabled \?\?/, 'speech stack flag should preserve explicit false settings');
assert.match(runtimeSettingsSource, /row\?\.tts_avatar_enabled \?\?/, 'TTS/avatar flag should preserve explicit false settings');
assert.match(runtimeSettingsSource, /row\?\.facilitation_analytics_enabled[\s\S]*\?\?/, 'analytics flag should preserve explicit false settings');

const participantViewSource = fs.readFileSync(
  path.join(root, 'src/components/session/messaging/ParticipantMessagingView.tsx'),
  'utf8'
);
assert.match(participantViewSource, /usePhase3RuntimeSettings/, 'participant runtime should load Phase 3 admin settings');
assert.match(participantViewSource, /phase3RuntimeReady = !isPhase3SettingsPending/, 'participant runtime should wait for settings before enabling Phase 3 features');
assert.match(participantViewSource, /enabled:\s*viewMode === 'participant' && ttsAvatarEnabled/, 'voice runtime should be gated by normalized settings');
assert.match(participantViewSource, /speechEnabled=\{speechStackEnabled && !aiIsSpeaking\}/, 'visible speech capture should require normalized settings and pause while AI audio is speaking');
assert.match(participantViewSource, /const handleModeAwareTextSubmit/, 'structured participant text should have a dedicated mode-aware submission path');
assert.match(participantViewSource, /visibility: isSilentResponseMode \? 'private_until_synthesis' : 'attributed'/, 'silent responses must persist as private mode inputs until synthesis');
assert.match(participantViewSource, /onSendMessage=\{\(\) => \{ void handleModeAwareTextSubmit\(\); \}\}/, 'the participant composer must use the mode-aware submission path');
assert.match(participantViewSource, /onHandRaiseToggle=\{async \(raised\)/, 'Debate / Panel must wire a participant hand-raise callback');
assert.match(participantViewSource, /updateModeParticipantState\(/, 'Debate / Panel hand raises must use the secured mode-state transport');
assert.match(participantViewSource, /setLocalDebateHandRaised\(raised\)/, 'Debate / Panel hand raises must acknowledge immediately while the state update is in flight');
assert.match(participantViewSource, /\? 'raised'\s*:\s*'idle'/, 'Debate / Panel hand raises must pass the semantic raised or idle state expected by the composer');
assert.match(participantViewSource, /modeState\?\.hand_raised/, 'Debate / Panel hand raises must restore from persisted participant state after refresh');

const sessionRoomStateSource = fs.readFileSync(path.join(root, 'src/hooks/useSessionRoomState.ts'), 'utf8');
assert.match(sessionRoomStateSource, /get\('participantId'\)/, 'structured mode state must read the session-local participant slot from the join URL');
assert.match(sessionRoomStateSource, /if \(Number\.isFinite\(participantSlot\) && participantSlot > 0\) return participantSlot/, 'the join URL participant slot must take precedence over an internal database row ID');

const inputFooterSource = fs.readFileSync(path.join(root, 'src/components/session/InputFooter.tsx'), 'utf8');
assert.match(inputFooterSource, /modeKey === 'debate' \|\| modeKey === 'debate_panel'/, 'backend Debate / Panel mode keys must render the controlled raise-hand composer');
assert.match(inputFooterSource, /\{floorGranted && \(/, 'a Debate participant granted the floor must receive an input composer');
assert.match(inputFooterSource, /Share your point with the room/, 'the granted Debate composer must clearly explain the participant action');

const hostViewSource = fs.readFileSync(path.join(root, 'src/components/session/messaging/SimplifiedHostMessagingView.tsx'), 'utf8');
assert.match(hostViewSource, /Speaker queue/, 'Debate / Panel must provide a visible host speaker queue');
assert.match(hostViewSource, /Grant floor/, 'Debate / Panel must let the host grant the controlled floor');
assert.match(hostViewSource, /updateModeParticipantState\(/, 'host floor grants must use the secured participant-state transport');

const envExampleSource = fs.readFileSync(path.join(root, '.env.example'), 'utf8');
for (const expected of [
  'VITE_PHASE3_STT_PROVIDER',
  'VITE_PHASE3_TTS_PROVIDER',
  'VITE_PHASE3_AVATAR_PROVIDER',
  'PHASE3_ANALYTICS_SNAPSHOT_INTERVAL_SECONDS',
]) {
  assert.match(envExampleSource, new RegExp(expected), `.env.example should document ${expected}`);
}

const analyticsSource = fs.readFileSync(path.join(root, 'src/hooks/useFacilitationAnalytics.ts'), 'utf8');
for (const expected of [
  'timelineBuckets',
  'estimatedSilenceGapCount',
  'facilitatorResponsivenessScore',
  'insightFlags',
]) {
  assert.match(analyticsSource, new RegExp(expected), `analytics hook should expose ${expected}`);
}

console.log('Phase 3 hardening tests passed.');
