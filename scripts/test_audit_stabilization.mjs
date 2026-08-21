import assert from 'node:assert/strict';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import esbuild from 'esbuild';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const tempDir = resolve('/tmp', 'aifacilitator-audit-tests');
const bundlePath = resolve(tempDir, 'audit-utils-bundle.mjs');

const entrySource = `
  export {
    normalizePersonName,
    validateEmailAddress,
    validatePasswordStrength,
    signupSchema,
  } from '${repoRoot}/src/utils/inputValidation.ts';
  export {
    calculateCanonicalSessionDurationMinutes,
    calculateEngagementScore,
    coerceIsoDate,
  } from '${repoRoot}/src/utils/sessionLifecycle.ts';
  export {
    validateScheduledStartAt,
    normalizeSessionDurationMinutes,
  } from '${repoRoot}/src/services/facilitatorService.ts';
  export {
    calculateSessionAnalyticsMetrics,
    summarizeParticipantSnapshot,
  } from '${repoRoot}/src/utils/sessionAnalyticsMetrics.ts';
`;

if (existsSync(tempDir)) rmSync(tempDir, { recursive: true, force: true });
await import('node:fs/promises').then(({ mkdir }) => mkdir(tempDir, { recursive: true }));
const entryPath = resolve(tempDir, 'audit-utils-entry.ts');
writeFileSync(entryPath, entrySource);

await esbuild.build({
  entryPoints: [entryPath],
  outfile: bundlePath,
  bundle: true,
  platform: 'node',
  format: 'esm',
  sourcemap: false,
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify('https://audit-test.invalid'),
    'import.meta.env.VITE_API_ANON_KEY': JSON.stringify('audit-test-anon-key'),
  },
  alias: {
    '@': resolve(repoRoot, 'src'),
  },
});

globalThis.localStorage ??= {
  _data: new Map(),
  get length() { return this._data.size; },
  getItem(key) { return this._data.get(key) ?? null; },
  setItem(key, value) { this._data.set(key, String(value)); },
  removeItem(key) { this._data.delete(key); },
  clear() { this._data.clear(); },
  key(index) { return Array.from(this._data.keys())[index] ?? null; },
};
globalThis.sessionStorage ??= {
  _data: new Map(),
  get length() { return this._data.size; },
  getItem(key) { return this._data.get(key) ?? null; },
  setItem(key, value) { this._data.set(key, String(value)); },
  removeItem(key) { this._data.delete(key); },
  clear() { this._data.clear(); },
  key(index) { return Array.from(this._data.keys())[index] ?? null; },
};

const utils = await import(pathToFileURL(bundlePath).href);

const test = (name, fn) => {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
};

test('localStorage polyfill matches the Web Storage clear contract', () => {
  localStorage.setItem('audit-key', 'value');
  localStorage.clear();
  assert.equal(localStorage.getItem('audit-key'), null);
  assert.equal(localStorage.length, 0);
});

test('signup rejects whitespace-only names', () => {
  const result = utils.signupSchema.safeParse({ name: '     ', email: 'qa@example.com', password: 'Strong!234' });
  assert.equal(result.success, false);
});

test('signup normalizes copied names and email casing', () => {
  const result = utils.signupSchema.safeParse({ name: '  Ada    Lovelace  ', email: 'ADA@Example.COM ', password: 'Strong!234' });
  assert.equal(result.success, true);
  assert.equal(result.data.name, 'Ada Lovelace');
  assert.equal(result.data.email, 'ada@example.com');
});

test('password policy requires length, case, number, and special character', () => {
  assert.equal(utils.validatePasswordStrength('weakpass').isValid, false);
  assert.equal(utils.validatePasswordStrength('Strong!234').isValid, true);
});

test('email validation rejects malformed invitation addresses', () => {
  assert.equal(utils.validateEmailAddress('bad-address').isValid, false);
  assert.equal(utils.validateEmailAddress('valid.user@example.com').isValid, true);
});

test('scheduled session guard rejects past dates', () => {
  const result = utils.validateScheduledStartAt(new Date(Date.now() - 5 * 60_000), Date.now());
  assert.equal(result.isValid, false);
});

test('scheduled session guard treats near-immediate starts as ad hoc and future starts as scheduled', () => {
  const now = Date.now();
  assert.equal(utils.validateScheduledStartAt(new Date(now + 30_000), now).isScheduled, false);
  const future = utils.validateScheduledStartAt(new Date(now + 10 * 60_000), now);
  assert.equal(future.isValid, true);
  assert.equal(future.isScheduled, true);
  assert.ok(future.scheduledIso);
});

test('duration guard rejects impossible session lengths and normalizes valid values', () => {
  assert.throws(() => utils.normalizeSessionDurationMinutes(0), /between/);
  assert.throws(() => utils.normalizeSessionDurationMinutes(24 * 60), /between/);
  assert.equal(utils.normalizeSessionDurationMinutes(59.6), 60);
});

test('canonical duration prefers session_started_at and clamps invalid values', () => {
  assert.equal(utils.calculateCanonicalSessionDurationMinutes({
    createdAt: '2026-01-01T09:00:00.000Z',
    startedAt: '2026-01-01T09:30:00.000Z',
    endedAt: '2026-01-01T10:00:00.000Z',
  }), 30);
  assert.equal(utils.calculateCanonicalSessionDurationMinutes({
    startedAt: '2026-01-01T10:00:00.000Z',
    endedAt: '2026-01-01T09:00:00.000Z',
  }), 1);
});

test('historical diagnostics preserve removed participants from privacy-safe event data', () => {
  const metrics = utils.calculateSessionAnalyticsMetrics([
    { event_type: 'participant_joined', created_at: '2026-01-01T10:00:00.000Z', data: { participant_id: 'attendee-a' } },
    { event_type: 'participant_joined', created_at: '2026-01-01T10:01:00.000Z', data: { participant_id: 'attendee-b' } },
    { event_type: 'message_sent', created_at: '2026-01-01T10:02:00.000Z', data: { participant_id: 'attendee-b' } },
    { event_type: 'participant_left', created_at: '2026-01-01T10:03:00.000Z', data: { participant_id: 'attendee-b' } },
  ], [
    { participant_id: 'attendee-a', is_host: false },
    { participant_id: 'host-1', is_host: true },
  ]);

  assert.equal(metrics.uniqueParticipants, 2);
  assert.equal(metrics.participantJoins, 2);
  assert.equal(metrics.reconnectEvents, 0);
  assert.equal(metrics.engagementScore, 0.5);
});

test('participant snapshot excludes host rows from attendee totals', () => {
  const snapshot = utils.summarizeParticipantSnapshot([
    { participant_id: 'host-1', is_host: true },
    { participant_id: 'attendee-a', is_host: false },
    { participant_id: 'attendee-a', is_host: false },
    { participant_id: 'attendee-b', is_host: false },
  ]);

  assert.equal(snapshot.hostParticipants, 1);
  assert.equal(snapshot.attendeeParticipants, 2);
  assert.equal(snapshot.totalRows, 4);
});

test('dashboard and host controls include P2 navigation and overflow affordances', () => {
  const dashboard = readFileSync(resolve(repoRoot, 'src/pages/PastWorkshops.tsx'), 'utf8');
  const hostHeader = readFileSync(resolve(repoRoot, 'src/components/session/host/HostHeader.tsx'), 'utf8');
  const videoGrid = readFileSync(resolve(repoRoot, 'src/components/session/video/SessionVideoGrid.tsx'), 'utf8');

  assert.match(dashboard, /fetchDashboardParticipantSnapshots/);
  assert.match(dashboard, /new URLSearchParams\(window\.location\.search\)\.get\('tab'\)/);
  assert.match(hostHeader, /\/past-workshops\?tab=active/);
  assert.match(hostHeader, /aria-pressed=\{analyticsOpen\}/);
  assert.match(videoGrid, /isMenuOpen/);
  assert.match(videoGrid, /Pin to spotlight/);
  assert.match(videoGrid, /aria-expanded=\{isMenuOpen\}/);
});

test('participant revocation contract is present in server and client source', () => {
  const server = readFileSync(resolve(repoRoot, 'supabase_proxy/server_fastapi.py'), 'utf8');
  const removalHook = readFileSync(resolve(repoRoot, 'src/hooks/useParticipantRemoval.ts'), 'utf8');
  const viewSelector = readFileSync(resolve(repoRoot, 'src/components/session/SessionViewSelector.tsx'), 'utf8');
  assert.match(server, /event_type = 'participant_removed'|participant_removed/);
  assert.match(server, /access_revoked/);
  assert.match(removalHook, /participant_removed/);
  assert.match(removalHook, /device_id/);
  assert.match(viewSelector, /Removed from session|removed from this session/i);
});

test('source-audit session security boundaries remain enforced', () => {
  const server = readFileSync(resolve(repoRoot, 'supabase_proxy/server_fastapi.py'), 'utf8');
  const modeService = readFileSync(resolve(repoRoot, 'src/services/modeOrchestratorService.ts'), 'utf8');
  const qrDialog = readFileSync(resolve(repoRoot, 'src/components/session/admin/AdminQrDialog.tsx'), 'utf8');

  assert.match(server, /async def _require_conversation_host_access/);
  assert.match(server, /A conversation_id=eq\.<id> filter is required for session data updates/);
  assert.match(server, /await websocket\.close\(code=1008/);
  assert.match(server, /def _safe_storage_path/);
  assert.match(server, /Administrators manage/);
  assert.match(modeService, /Number\.isSafeInteger\(normalizedConversationId\)/);
  assert.match(qrDialog, /QRCodeSVG/);
  assert.doesNotMatch(qrDialog, /api\.qrserver\.com/);
});

test('mobile lifecycle paths do not strand a participant behind a welcome gate or unexplained voice failure', () => {
  const viewSelector = readFileSync(resolve(repoRoot, 'src/components/session/SessionViewSelector.tsx'), 'utf8');
  const planLimits = readFileSync(resolve(repoRoot, 'src/hooks/usePlanLimits.ts'), 'utf8');
  const chatInput = readFileSync(resolve(repoRoot, 'src/components/chat/ChatInput.tsx'), 'utf8');

  assert.match(viewSelector, /else if \(sessionStartedInDB\) \{/);
  assert.match(viewSelector, /welcome message is an enhancement, not a prerequisite/i);
  assert.ok(viewSelector.indexOf('else if (sessionStartedInDB)') < viewSelector.indexOf("phase = 'ai_generating'"));
  assert.doesNotMatch(planLimits, /Failed to fetch facilitator count/);
  assert.match(planLimits, /retry: 1/);
  assert.match(chatInput, /Voice typing is not available in this browser/);
});

test('no-report session stop uses the authenticated atomic lifecycle endpoint', () => {
  const server = readFileSync(resolve(repoRoot, 'supabase_proxy/server_fastapi.py'), 'utf8');
  const closureHook = readFileSync(resolve(repoRoot, 'src/hooks/useSessionClosure.ts'), 'utf8');

  assert.match(server, /elif func_name == "stop-session"/);
  assert.match(server, /Only the session host can end this session/);
  assert.match(server, /already_ended/);
  assert.match(server, /INSERT INTO session_events/);
  assert.match(server, /is_session_ended": True, "status": "completed"/);
  assert.match(closureHook, /functions\.invoke\('stop-session'/);
  assert.doesNotMatch(closureHook, /\.from\('conversations'\)\s*\.update\(/);
});

test('protected desktop routes clear explicitly rejected cached sessions instead of loading with a stale token', () => {
  const authContext = readFileSync(resolve(repoRoot, 'src/contexts/AuthContext.tsx'), 'utf8');
  const protectedRoute = readFileSync(resolve(repoRoot, 'src/components/ProtectedRoute.tsx'), 'utf8');

  assert.match(authContext, /freshUserError\?\.status === 401/);
  assert.match(authContext, /freshUserError\?\.status === 403/);
  assert.match(authContext, /await api\.auth\.signOut\(\)/);
  assert.match(authContext, /setSession\(null\);\s*setUser\(null\);/s);
  assert.match(protectedRoute, /Navigate to="\/login"/);
});

test('authentication critical path remains bounded and reports retryable service pressure clearly', () => {
  const server = readFileSync(resolve(repoRoot, 'supabase_proxy/server_fastapi.py'), 'utf8');
  const login = readFileSync(resolve(repoRoot, 'src/pages/Login.tsx'), 'utf8');

  assert.match(server, /async def _acquire_auth_connection\(operation: str\)/);
  assert.match(server, /asyncio\.timeout\(5\)/);
  assert.match(server, /auth_service_busy/);
  assert.match(server, /async with _acquire_auth_connection\("credential lookup"\)/);
  assert.match(server, /await asyncio\.to_thread\(_verify_password, password, stored_hash\)/);
  assert.match(server, /await asyncio\.to_thread\(\s*_oai_client_report\.chat\.completions\.create,/s);
  assert.match(login, /Sign-in is temporarily busy\. Please wait a few seconds and try again\./);
  assert.match(login, /Sign-in is taking longer than expected\. Please wait a few seconds and try again\./);
});

test('session stop remains bounded and cannot be falsely failed by post-stop cache refresh', () => {
  const server = readFileSync(resolve(repoRoot, 'supabase_proxy/server_fastapi.py'), 'utf8');
  const closure = readFileSync(resolve(repoRoot, 'src/hooks/useSessionClosure.ts'), 'utf8');
  const api = readFileSync(resolve(repoRoot, 'src/lib/api.ts'), 'utf8');

  assert.match(server, /async def _acquire_lifecycle_connection\(operation: str\)/);
  assert.match(server, /_acquire_lifecycle_connection\("stop session"\)/);
  assert.match(server, /session_service_busy/);
  assert.match(closure, /timeoutMs: 12_000/);
  assert.match(closure, /Promise\.allSettled/);
  assert.match(closure, /failed to fetch\|abort\|timed out/);
  assert.match(api, /request_timeout/);
  assert.match(api, /The request timed out\. Please wait a few seconds and try again\./);
});

test('participant messages and WebRTC signals retain conversation-scoped join-token delivery', () => {
  const api = readFileSync(resolve(repoRoot, 'src/lib/api.ts'), 'utf8');
  const server = readFileSync(resolve(repoRoot, 'supabase_proxy/server_fastapi.py'), 'utf8');
  const saver = readFileSync(resolve(repoRoot, 'src/hooks/messageSender/useMessageSaver.ts'), 'utf8');
  const webrtc = readFileSync(resolve(repoRoot, 'src/hooks/useWebRTCSession.ts'), 'utf8');

  assert.match(api, /getParticipantScopedConversationId/);
  assert.match(api, /isParticipantMessage/);
  assert.match(api, /isWebRtcSignal/);
  assert.match(api, /X-Join-Token/);
  assert.match(server, /participant_webrtc_signal/);
  assert.match(server, /signal_data\.get\("kind"\) == "webrtc_signal"/);
  assert.match(server, /"messages", "session_participants", "session_events"/);
  assert.match(saver, /persistedMessage/);
  assert.match(saver, /newMessage\.id = String\(persisted\.id\)/);
  assert.match(webrtc, /role !== 'host'/);
});

test('mobile session labels distinguish joined seats from actual live video', () => {
  const participantView = readFileSync(resolve(repoRoot, 'src/components/session/messaging/ParticipantMessagingView.tsx'), 'utf8');
  const hostContent = readFileSync(resolve(repoRoot, 'src/components/session/host/HostSessionContent.tsx'), 'utf8');

  assert.match(participantView, /participant seats joined/);
  assert.match(participantView, /Your camera/);
  assert.match(participantView, /Room video/);
  assert.match(participantView, /Video linked — host camera is off/);
  assert.match(hostContent, /Video linked — participant camera is off/);
});

test('mobile facilitator voice remains enabled, replayable, and independently audible on every authorized device', () => {
  const server = readFileSync(resolve(repoRoot, 'supabase_proxy/server_fastapi.py'), 'utf8');
  const participantView = readFileSync(resolve(repoRoot, 'src/components/session/messaging/ParticipantMessagingView.tsx'), 'utf8');
  const hostContent = readFileSync(resolve(repoRoot, 'src/components/session/host/HostSessionContent.tsx'), 'utf8');
  const voiceHook = readFileSync(resolve(repoRoot, 'src/hooks/facilitator/useFacilitatorVoice.ts'), 'utf8');

  assert.match(server, /"tts_avatar_enabled": True/);
  assert.match(server, /"speech_stack_enabled": True/);
  assert.match(participantView, /phase3Settings\?\.tts_avatar_enabled !== false/);
  assert.match(participantView, /!audioUnlocked \|\| !lastAssistantMessage/);
  assert.doesNotMatch(participantView, /hasTtsEventForMessage/);
  assert.match(participantView, /Enable facilitator audio/);
  assert.match(participantView, /Play latest reply/);
  assert.match(participantView, /Facilitator audio is ready/);
  assert.match(hostContent, /!audioUnlocked \|\| !latestFacilitatorMessage/);
  assert.match(hostContent, /Play latest reply/);
  assert.match(voiceHook, /FacilitatorVoicePlaybackState/);
  assert.match(voiceHook, /unlockAudio/);
  assert.match(voiceHook, /data:audio\/wav;base64/);
});

console.log('\nAudit stabilization regression tests passed.');
