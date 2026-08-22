import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const includes = (source, needle, label) => assert.ok(source.includes(needle), `${label} must include ${needle}`);
const excludes = (source, needle, label) => assert.ok(!source.includes(needle), `${label} must not include ${needle}`);

const server = read('supabase_proxy/server_fastapi.py');
const selector = read('src/components/session/SessionViewSelector.tsx');
const setup = read('src/hooks/useSessionParticipantSetup.ts');
const realtime = read('src/hooks/useSessionRealtime.ts');
const hostManager = read('src/hooks/useHostParticipantManager.ts');
const hostLogic = read('src/hooks/useSessionHostLogic.ts');
const participantContext = read('src/hooks/useSessionParticipantContext.ts');

// Database truth: capacity includes the host; the persisted current count counts attendees only.
includes(server, 'AND COALESCE(is_host, FALSE) = FALSE', 'atomic join count excludes host rows');
includes(server, '(SELECT participant_capacity FROM decision) AS participant_capacity', 'join returns the normalized attendee capacity');
includes(server, '"current_count": current_participant_count', 'participant_joined event carries the authoritative attendee count');
includes(server, '"current_participants": current_participant_count', 'join response and participant broadcast expose the attendee count');
includes(server, '"table": "conversations"', 'join emits a conversations update for host count subscribers');
includes(server, '"participants": attendee_capacity + 1', 'conversation update preserves host-inclusive capacity');

// A one-attendee session displays one joined attendee, not zero after a second host subtraction.
excludes(selector, 'current_participants || 0) - 1', 'waiting room count label');
includes(selector, 'currentParticipantCount={Math.max(props.conversation?.current_participants || 0, 0)}', 'waiting room uses attendee count directly');
includes(setup, 'const attendeeCount = currentCount;', 'participant setup uses attendee count directly');
includes(participantContext, 'const attendeeCount = participantCount;', 'participant context uses attendee count directly');
excludes(realtime, 'current_participants || 0) - 1', 'participant realtime fullness checks');
includes(realtime, 'const attendeeCount = Math.max(0, conversation.current_participants || 0);', 'participant realtime compares attendee count directly');

// The host start button has the same capacity semantics and roster fallback.
includes(hostManager, 'const max     = Math.max((data.participants || 0) - 1, 0);', 'host manager normalizes host-inclusive capacity once');
includes(hostManager, 'const attendeeCount = updated.filter((participant) => !participant.isHost).length;', 'host manager reconciles delayed count broadcasts from roster data');
includes(hostLogic, 'const attendeeCountFromConversation = Math.max(currentCount, 0);', 'host readiness uses attendee count directly');
includes(hostLogic, 'const attendeeCapacityFromManager = Math.max(maxCount, 0);', 'host does not subtract normalized capacity twice');

console.log('Live seat synchronization contract passed: one persisted attendee maps to one displayed joined seat and host readiness update.');
