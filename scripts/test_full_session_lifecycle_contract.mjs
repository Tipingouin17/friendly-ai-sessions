import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const source = (relativePath) => readFileSync(resolve(root, relativePath), 'utf8');

const server = source('supabase_proxy/server_fastapi.py');
const startHook = source('src/hooks/useSessionStart.ts');
const sessionInterface = source('src/hooks/useSessionInterface.ts');
const sessionStatus = source('src/hooks/useSessionStatus.ts');
const sessionValidation = source('src/hooks/useSessionValidation.ts');
const sessionContext = source('src/hooks/useSessionContextValue.ts');
const messageSaver = source('src/hooks/messageSender/useMessageSaver.ts');
const api = source('src/lib/api.ts');
const messageFetch = source('src/hooks/session-messages/useMessageFetching.ts');
const closure = source('src/hooks/useSessionClosure.ts');

const startMatch = server.match(/elif func_name == "start-session":([\s\S]*?)\n    # ──/);
assert.ok(startMatch, 'The authoritative start-session endpoint must exist.');
const startBody = startMatch[1];

// Create -> host launch: the server contract must use only durable schema fields.
assert.match(startBody, /await _require_conversation_host_access\(request, start_conversation_id\)/);
assert.match(startBody, /UPDATE conversations\s+SET session_started = TRUE,\s+status = 'active'/s);
assert.doesNotMatch(startBody, /session_started_at/);
assert.match(startBody, /AND COALESCE\(is_session_ended, FALSE\) = FALSE/);
assert.match(startBody, /RETURNING id, session_started, status, is_session_ended, welcome_message_status/);
assert.match(startBody, /async with start_conn\.transaction\(\):/);
assert.match(startBody, /INSERT INTO messages \(conversation_id, content, role, name\)/);
assert.match(startBody, /"welcome": "committed"/);
assert.doesNotMatch(startBody, /await _maybe_generate_welcome_message\(start_conversation_id\)/);
assert.match(startBody, /await _require_conversation_host_access\(request, start_conversation_id\)/);

// The host UI must call only the authoritative route, never a direct DB/LLM sequence.
assert.match(startHook, /functions\.invoke\(\s*'start-session'/s);
assert.match(sessionInterface, /functions\.invoke\(\s*'start-session'/s);
assert.doesNotMatch(startHook, /handle-facilitator-response/);

// Start -> active room: only terminal states may end a participant session.
assert.match(sessionStatus, /TERMINAL_SESSION_STATUSES/);
assert.match(sessionValidation, /TERMINAL_SESSION_STATUSES/);
assert.doesNotMatch(sessionStatus, /status !== 'active'/);
assert.doesNotMatch(sessionValidation, /data\.status !== 'active'/);
assert.match(sessionStatus, /isParticipantRoute \? '\/' : '\/past-workshops'/);
assert.doesNotMatch(sessionInterface, /title: "Session Started"/);
assert.match(sessionContext, /conversation\.status === 'active'/);

// Join -> message -> welcome: participant requests are scoped and the welcome has one server owner.
assert.match(api, /const joinToken = getJoinToken\(conversationId\)/);
assert.match(messageSaver, /if \(persisted\.id != null\) newMessage\.id = String\(persisted\.id\)/);
assert.doesNotMatch(messageFetch, /generate_ai_welcome/);
assert.match(server, /async def _maybe_generate_welcome_message/);
assert.match(server, /welcome_message_status/);

// Active room -> stop: close must use the authenticated atomic server operation.
assert.match(closure, /functions\.invoke\(\s*'stop-session'/s);
assert.match(server, /elif func_name == "stop-session":/);

console.log('Full session lifecycle contract passed: create → join → start → active → message/welcome → stop.');
