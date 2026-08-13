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

console.log('\nAudit stabilization regression tests passed.');
