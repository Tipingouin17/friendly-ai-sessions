import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import path from 'node:path';

const ROOT = process.cwd();
const REPORT_DIR = path.join(ROOT, 'artifacts', 'api-stress');
const RUN_ID = new Date().toISOString().replace(/[:.]/g, '-');
const REPORT_PATH = path.join(REPORT_DIR, `api-stress-10-participants-${RUN_ID}.json`);

function parseDotEnv(text) {
  const out = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

async function loadConfig() {
  const envText = await readFile(path.join(ROOT, '.env.development'), 'utf8');
  const parsed = parseDotEnv(envText);
  const apiUrl = process.env.VITE_API_URL || parsed.VITE_API_URL;
  const anonKey = process.env.VITE_API_ANON_KEY || parsed.VITE_API_ANON_KEY;
  if (!apiUrl || !anonKey) throw new Error('Missing VITE_API_URL or VITE_API_ANON_KEY');
  return { apiUrl: apiUrl.replace(/\/$/, ''), anonKey };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class ApiHarness {
  constructor({ apiUrl, anonKey }) {
    this.apiUrl = apiUrl;
    this.anonKey = anonKey;
    this.steps = [];
    this.errors = [];
    this.sseEvents = [];
  }

  async request(label, pathOrUrl, opts = {}) {
    const started = performance.now();
    const url = pathOrUrl.startsWith('http') ? pathOrUrl : `${this.apiUrl}${pathOrUrl}`;
    const headers = {
      apikey: this.anonKey,
      ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(opts.headers || {}),
    };
    headers.Authorization = `Bearer ${opts.token || this.anonKey}`;
    if (opts.joinToken) headers['X-Join-Token'] = opts.joinToken;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? 30000);
    try {
      const res = await fetch(url, {
        method: opts.method || 'GET',
        headers,
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
        signal: controller.signal,
      });
      const text = await res.text();
      let body = null;
      try { body = text ? JSON.parse(text) : null; } catch { body = text; }
      const durationMs = Math.round(performance.now() - started);
      const step = { label, method: opts.method || 'GET', path: pathOrUrl.replace(/[?&]apikey=[^&]+/g, '$&<redacted>'), status: res.status, ok: res.ok, durationMs };
      this.steps.push(step);
      if (!res.ok) {
        const err = { ...step, body };
        this.errors.push(err);
        throw new Error(`${label} failed with HTTP ${res.status}: ${typeof body === 'string' ? body : JSON.stringify(body)}`);
      }
      return { res, body, durationMs };
    } finally {
      clearTimeout(timeout);
    }
  }

  async signupHost() {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const email = `api-stress-${suffix}@example.test`;
    const password = `StressTest-${suffix}-Aa1!`;
    const { body } = await this.request('host signup', '/auth/v1/signup', {
      method: 'POST',
      body: { email, password, data: { name: 'API Stress Host' } },
      timeoutMs: 45000,
    });
    if (body?.access_token && body?.user?.id) {
      return { email, password, token: body.access_token, userId: body.user.id, authMode: 'verified_signup' };
    }

    // Current dev auth correctly requires email verification before issuing a JWT.
    // For this browserless backend stress test, continue with the public anon-key
    // REST path and a synthetic user UUID. This still exercises conversation
    // creation, secure join-token validation, session participant concurrency,
    // scoped SSE, and message insertion without using a browser or voice.
    return { email, password: null, token: null, userId: randomUUID(), authMode: 'anon_after_unverified_signup' };
  }

  async ensureSyntheticProfile(userId, email) {
    await this.request('create synthetic host profile', '/rest/v1/profiles', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: {
        id: userId,
        role: 'free',
        current_plan_id: 1,
        subscription_status: 'api_stress_test',
        email,
      },
      timeoutMs: 30000,
    }).catch(async (err) => {
      // Some deployments already create profiles during signup or do not expose
      // optional profile columns in the generated type surface. Continue if the
      // row already exists; otherwise surface the actual setup problem.
      if (!String(err.message).includes('duplicate key')) throw err;
    });
  }

  async chooseWorkshop(token) {
    if (!token) return { id: null, title: 'No template: API stress fallback conversation' };
    const { body } = await this.request('list active workshops', '/rest/v1/sessions?select=*&status=eq.true&limit=50', {
      token,
      timeoutMs: 30000,
    });
    const rows = Array.isArray(body) ? body : [];
    const unlocked = rows.find((row) => row.lock !== true) || rows[0];
    if (!unlocked?.id) return { id: null, title: 'No template: API stress fallback conversation' };
    return { id: unlocked.id, title: unlocked.title || unlocked.name || `session-${unlocked.id}` };
  }

  async createConversation(token, userId, workshopId) {
    const payload = {
      participant_description: 'API-only stress simulation with ten participants; no browser and no voice checks.',
      language: 'English',
      // Stored capacity is host-inclusive; this readiness test still targets
      // ten non-host attendees joining alongside one host.
      participants: 11,
      ...(workshopId ? { sessions_id: workshopId } : {}),
      accept_terms_and_conditions: true,
      is_saved: false,
      is_session_ended: false,
      user_id: userId,
      session_duration_minutes: 15,
    };
    const { body } = await this.request('create conversation', '/rest/v1/conversations?select=*', {
      method: 'POST',
      token,
      headers: { Prefer: 'return=representation', Accept: 'application/vnd.pgrst.object+json' },
      body: payload,
      timeoutMs: 60000,
    });
    if (!body?.id) throw new Error(`Conversation creation response missing id: ${JSON.stringify(body)}`);
    if (!body.join_token) {
      const fetched = await this.getConversation(token, body.id);
      return fetched;
    }
    return body;
  }

  async getConversation(token, conversationId) {
    const { body } = await this.request('fetch conversation', `/rest/v1/conversations?select=*&id=eq.${encodeURIComponent(conversationId)}`, {
      token,
      headers: { Accept: 'application/vnd.pgrst.object+json' },
      timeoutMs: 30000,
    });
    if (!body?.id) throw new Error(`Conversation fetch response missing id: ${JSON.stringify(body)}`);
    return body;
  }

  async joinParticipant(conversationId, joinToken, idx, isHost = false) {
    const name = isHost ? 'API Stress Host Participant' : `API Participant ${String(idx).padStart(2, '0')}`;
    const body = {
      conversation_id: conversationId,
      participant_name: name,
      avatar_seed: randomUUID(),
      is_anonymous: !isHost,
      is_host: isHost,
      device_id: `api-stress-${RUN_ID}-${isHost ? 'host' : idx}-${randomUUID()}`,
      ...(joinToken ? { join_token: joinToken } : {}),
    };
    const result = await this.request(isHost ? 'join host participant' : `join participant ${idx}`, '/functions/v1/join-session', {
      method: 'POST',
      joinToken: isHost ? undefined : joinToken,
      body,
      timeoutMs: 45000,
    });
    return result.body;
  }

  async startSession(token, conversationId) {
    await this.request('mark session started', `/rest/v1/conversations?id=eq.${encodeURIComponent(conversationId)}&select=*`, {
      method: 'PATCH',
      token,
      headers: { Prefer: 'return=representation' },
      body: { session_started: true },
      timeoutMs: 30000,
    });
  }

  async sendMessage(conversationId, joinToken, participant, idx) {
    const participantId = participant.participant_id;
    const payload = {
      conversation_id: conversationId,
      participant_id: participantId,
      content: {
        text: `API stress message ${idx} from participant ${participantId}`,
        participant_id: participantId,
        name: participant.name,
        is_anonymous: true,
      },
      role: 'user',
      name: participant.name,
    };
    const { body } = await this.request(`insert message ${idx}`, '/rest/v1/messages?select=*', {
      method: 'POST',
      joinToken,
      headers: { Prefer: 'return=representation' },
      body: payload,
      timeoutMs: 30000,
    });
    return Array.isArray(body) ? body[0] : body;
  }

  async fetchParticipants(authToken, conversationId, joinToken) {
    const { body } = await this.request('fetch participants final', `/rest/v1/session_participants?select=*&conversation_id=eq.${encodeURIComponent(conversationId)}&order=participant_id.asc`, {
      token: authToken,
      joinToken,
      timeoutMs: 30000,
    });
    return Array.isArray(body) ? body : [];
  }

  async fetchMessages(authToken, conversationId, joinToken) {
    const { body } = await this.request('fetch messages final', `/rest/v1/messages?select=*&conversation_id=eq.${encodeURIComponent(conversationId)}&order=created_at.asc`, {
      token: authToken,
      joinToken,
      timeoutMs: 30000,
    });
    return Array.isArray(body) ? body : [];
  }

  openSseProbe(label, topic, durationMs = 15000) {
    const params = new URLSearchParams({ apikey: this.anonKey, topic });
    const url = `${this.apiUrl}/realtime/v1/sse?${params.toString()}`;
    const controller = new AbortController();
    const done = (async () => {
      const started = performance.now();
      const timeout = setTimeout(() => controller.abort(), durationMs);
      let status = null;
      let chunks = 0;
      let bytes = 0;
      try {
        const res = await fetch(url, { headers: { Accept: 'text/event-stream' }, signal: controller.signal });
        status = res.status;
        this.steps.push({ label: `${label} SSE connect`, method: 'GET', path: '/realtime/v1/sse?apikey=<redacted>&topic=' + topic, status, ok: res.ok, durationMs: Math.round(performance.now() - started) });
        if (!res.ok || !res.body) throw new Error(`${label} SSE failed with HTTP ${res.status}`);
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        while (performance.now() - started < durationMs) {
          const { value, done: readerDone } = await reader.read();
          if (readerDone) break;
          chunks += 1;
          bytes += value.byteLength;
          const text = decoder.decode(value, { stream: true });
          for (const block of text.split('\n\n')) {
            if (block.includes('data:')) this.sseEvents.push({ label, sample: block.slice(0, 500) });
          }
        }
      } catch (err) {
        if (err?.name !== 'AbortError') {
          const e = { label: `${label} SSE`, status, message: err instanceof Error ? err.message : String(err) };
          this.errors.push(e);
        }
      } finally {
        clearTimeout(timeout);
        controller.abort();
      }
      return { label, status, chunks, bytes };
    })();
    return done;
  }
}

async function main() {
  await mkdir(REPORT_DIR, { recursive: true });
  const config = await loadConfig();
  const api = new ApiHarness(config);
  const startedAt = new Date().toISOString();
  const summary = {
    runId: RUN_ID,
    startedAt,
    apiUrl: config.apiUrl,
    participantTarget: 10,
    voiceTested: false,
  };

  let host = null;
  let workshop = null;
  let conversation = null;
  let hostJoin = null;
  let joins = [];
  let messages = [];
  let finalParticipants = [];
  let finalMessages = [];
  let sseResults = [];

  try {
    host = await api.signupHost();
    if (!host.token) await api.ensureSyntheticProfile(host.userId, host.email);
    workshop = await api.chooseWorkshop(host.token);
    conversation = await api.createConversation(host.token, host.userId, workshop.id);
    if (!conversation.join_token) throw new Error('Conversation has no join_token; cannot simulate secure participant joins');

    const participantSse = api.openSseProbe('participants', `realtime:public:session_participants:conversation_id=eq.${conversation.id}`, 18000);
    const messageSse = api.openSseProbe('messages', `realtime:public:messages:conversation_id=eq.${conversation.id}`, 18000);
    await sleep(1000);

    hostJoin = await api.joinParticipant(conversation.id, conversation.join_token, 0, true);
    joins = await Promise.all(Array.from({ length: 10 }, (_, i) => api.joinParticipant(conversation.id, conversation.join_token, i + 1)));
    await api.startSession(host.token, conversation.id);
    messages = await Promise.all(joins.map((participant, i) => api.sendMessage(conversation.id, conversation.join_token, participant, i + 1)));

    await sleep(3000);
    finalParticipants = await api.fetchParticipants(host.token, conversation.id, conversation.join_token);
    finalMessages = await api.fetchMessages(host.token, conversation.id, conversation.join_token);
    conversation = await api.getConversation(host.token, conversation.id);
    sseResults = await Promise.all([participantSse, messageSse]);
  } catch (err) {
    api.errors.push({ label: 'main', message: err instanceof Error ? err.message : String(err) });
  }

  const readinessErrors = [];
  const participantIds = joins.map((j) => j?.participant_id).filter(Boolean);
  const uniqueParticipantIds = new Set(participantIds);
  const finalNonHostParticipants = finalParticipants.filter((p) => !p.is_host);
  const sseCrossTalk = api.sseEvents.filter((evt) => {
    const isMessageProbe = evt.label === 'messages';
    const isParticipantProbe = evt.label === 'participants';
    return (isMessageProbe && evt.sample.includes('"table":"session_participants"'))
      || (isParticipantProbe && evt.sample.includes('"table":"messages"'));
  });

  if (api.errors.length > 0) readinessErrors.push(`API errors recorded: ${api.errors.length}`);
  if (joins.filter((j) => j?.success).length !== 10) readinessErrors.push('Not all ten participant joins returned success');
  if (participantIds.length !== 10) readinessErrors.push(`Expected 10 participant IDs from joins, got ${participantIds.length}`);
  if (uniqueParticipantIds.size !== 10) readinessErrors.push(`Expected 10 unique participant IDs from joins, got ${uniqueParticipantIds.size}`);
  if (finalNonHostParticipants.length !== 10) readinessErrors.push(`Expected 10 persisted non-host participant rows, got ${finalNonHostParticipants.length}`);
  if (finalParticipants.length !== 11) readinessErrors.push(`Expected 11 persisted participant rows including host, got ${finalParticipants.length}`);
  if (conversation?.current_participants !== 11) readinessErrors.push(`Expected conversation.current_participants to be 11, got ${conversation?.current_participants}`);
  if (messages.filter(Boolean).length !== 10) readinessErrors.push(`Expected 10 inserted messages, got ${messages.filter(Boolean).length}`);
  if (finalMessages.length !== 10) readinessErrors.push(`Expected 10 final message rows, got ${finalMessages.length}`);
  if (sseCrossTalk.length > 0) readinessErrors.push(`Detected ${sseCrossTalk.length} SSE table cross-talk sample(s)`);

  const endedAt = new Date().toISOString();
  const report = {
    summary: {
      ...summary,
      endedAt,
      ok: readinessErrors.length === 0,
      workshop,
      conversation: conversation ? {
        id: conversation.id,
        participantsCapacity: conversation.participants,
        currentParticipants: conversation.current_participants,
        sessionStarted: conversation.session_started,
        isSessionEnded: conversation.is_session_ended,
        status: conversation.status,
      } : null,
      hostUserId: host?.userId || null,
      hostEmail: host?.email || null,
      authMode: host?.authMode || null,
      hostJoinParticipantId: hostJoin?.participant_id || null,
      participantJoinSuccesses: joins.filter((j) => j?.success).length,
      participantIds,
      uniqueParticipantIdCount: uniqueParticipantIds.size,
      finalNonHostParticipantRows: finalNonHostParticipants.length,
      insertedMessageCount: messages.filter(Boolean).length,
      finalParticipantRows: finalParticipants.length,
      finalMessageRows: finalMessages.length,
      sseEventSamples: api.sseEvents.length,
      sseResults,
      errorCount: api.errors.length,
      readinessErrorCount: readinessErrors.length,
    },
    steps: api.steps,
    errors: api.errors,
    readinessErrors,
    sseCrossTalkSamples: sseCrossTalk.slice(0, 10),
    joinedParticipants: joins,
    insertedMessages: messages.map((m) => m ? ({ id: m.id, participant_id: m.participant_id, role: m.role, name: m.name }) : null),
    finalParticipants: finalParticipants.map((p) => ({ participant_id: p.participant_id, name: p.name, is_host: p.is_host, is_anonymous: p.is_anonymous, created_at: p.created_at })),
    sseEventSamples: api.sseEvents.slice(0, 20),
  };

  await writeFile(REPORT_PATH, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ reportPath: REPORT_PATH, summary: report.summary }, null, 2));
  if (!report.summary.ok) {
    console.error('Readiness check failed:', readinessErrors);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
