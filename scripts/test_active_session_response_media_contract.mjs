import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
const assertContains = (source, needle, label) => {
  assert.ok(source.includes(needle), `${label} should include ${needle}`);
};
const assertNotContains = (source, needle, label) => {
  assert.ok(!source.includes(needle), `${label} should not include ${needle}`);
};

const chatInput = read('src/components/chat/ChatInput.tsx');
const inputFooter = read('src/components/session/InputFooter.tsx');
const participantView = read('src/components/session/messaging/ParticipantMessagingView.tsx');
const messageSender = read('src/hooks/useMessageSender.ts');
const messagingArea = read('src/components/session/MessagingArea.tsx');
const sessionContainer = read('src/components/session/SessionContainer.tsx');
const sessionTypes = read('src/types/session.ts');
const hostContent = read('src/components/session/host/HostSessionContent.tsx');
const hostMessaging = read('src/components/session/messaging/SimplifiedHostMessagingView.tsx');
const participantLoadingShell = read('src/components/session/ParticipantLoadingShell.tsx');
const webRTCSession = read('src/hooks/useWebRTCSession.ts');
const fastApiServer = read('supabase_proxy/server_fastapi.py');
const autoStartSession = read('src/hooks/useAutoStartSession.ts');
const hostLogic = read('src/hooks/useSessionHostLogic.ts');
const sessionState = read('src/hooks/useSessionState.ts');

// Voice and typed turns share one durable message boundary.
assertContains(chatInput, 'message: finalizedMessage', 'speech final callback exports an explicit finalized message snapshot');
assertContains(chatInput, 'Parents must persist this explicit value rather than read React state', 'speech final callback documents stale-state protection');
assertContains(inputFooter, 'message: string', 'input footer preserves finalized message snapshot');
assertContains(participantView, 'const persistedSpeechTurnKeyRef', 'participant guards duplicate mobile speech end callbacks');
assertContains(participantView, "if (isOpenDiscussionMode) {\n      const turnKey", 'open discussion has a dedicated persisted speech branch');
assertContains(participantView, 'void onSendMessage(message);', 'open discussion voice uses the normal durable sender');
assertContains(participantView, "if (isOpenDiscussionMode) {\n      const turnKey", 'open discussion voice avoids the mode-input-only branch used by other interactions');
assertContains(participantView, "composer: isOpenDiscussionMode ? 'open_discussion_persisted_voice_message'", 'speech analytics records persisted open discussion routing');
assertContains(messageSender, 'async (messageOverride?: string)', 'message sender accepts explicit text snapshots');
assertContains(messageSender, 'const sentMessage = (messageOverride ?? sessionState.inputMessage).trim();', 'typed and voice text converge before persistence');
assertContains(messageSender, 'saveUserMessage({', 'shared sender retains persisted message saver');
assertContains(messagingArea, 'onSendMessage?: (messageOverride?: string) => Promise<void>;', 'messaging area preserves explicit sender contract');
assertContains(sessionContainer, 'handleSendMessage: (messageOverride?: string) => Promise<void>;', 'session container preserves explicit sender contract');
assertContains(sessionTypes, 'handleSendMessage: (messageOverride?: string) => Promise<void>;', 'public session type preserves explicit sender contract');

// The first room message is availability-critical: it is persisted before any
// provider completion and can therefore never remain indefinitely in preparation.
assertContains(fastApiServer, 'claim_acquired = False', 'welcome claim has recoverable ownership tracking');
assertContains(fastApiServer, 'The first visible room message is availability-critical.', 'welcome documents its non-provider critical path');
assertContains(fastApiServer, "_used_fallback = True", 'welcome marks its deterministic opening as terminal fallback-ready');
assertContains(fastApiServer, 'Welcome to "{_session_title}"!', 'welcome uses a facilitator-specific deterministic opening');
assertContains(fastApiServer, 'async with start_conn.transaction():', 'start-session wraps activation and welcome persistence in one transaction');
assertContains(fastApiServer, "INSERT INTO messages (conversation_id, content, role, name)", 'start-session writes the deterministic welcome row directly');
assertContains(fastApiServer, '"welcome": "committed"', 'start-session reports a committed rather than scheduled opening');
assertNotContains(fastApiServer, 'await _maybe_generate_welcome_message(start_conversation_id)', 'start-session never relies on detached welcome generation');
assertContains(fastApiServer, "'fallback_ready' if _used_fallback else 'ai_ready'", 'welcome persists a terminal fallback-ready status');
assertContains(fastApiServer, "WHERE id = $1 AND welcome_message_status = 'ai_generating'", 'welcome failure releases only its active generation claim');
assertNotContains(fastApiServer, '_oai_client_welcome', 'welcome must not wait on a provider client');
assertContains(fastApiServer, 'FACILITATOR_PROVIDER_TIMEOUT_SECONDS = 15', 'facilitator reply has an explicit provider timeout');
assertContains(fastApiServer, 'timeout=FACILITATOR_PROVIDER_TIMEOUT_SECONDS', 'facilitator reply bounds both provider work and client resolution');
assertContains(fastApiServer, '_oai_client_bg = await asyncio.wait_for(', 'facilitator reply resolves configured provider client inside the guarded boundary');
assertContains(fastApiServer, 'facilitator provider returned an empty response', 'empty provider reply output falls back');
assertContains(fastApiServer, 'provider unavailable for conv=%s; persisting fallback', 'reply provider failure produces persisted fallback copy');
assertContains(fastApiServer, 'INSERT INTO messages (conversation_id, content, role, name, ', 'assistant fallback uses the standard persisted messages contract');
assertContains(fastApiServer, 'manager.broadcast(str(conv_id)', 'persisted assistant fallback broadcasts to room clients');

// A full room may become ready, but only the host may call the atomic start endpoint.
assertNotContains(autoStartSession, 'await onStartSession()', 'legacy auto-start hook cannot call the host start operation');
assertNotContains(autoStartSession, 'autoStartTimeoutRef', 'legacy auto-start timer has been removed');
assertNotContains(hostLogic, 'void triggerAutoStart(', 'host capacity callbacks never initiate session start');
assertNotContains(sessionState, 'setSessionStarted(true)', 'participant capacity state cannot locally mark the room live');

// Host camera changes must request renegotiation from the designated participant offerer,
// without restarting ICE for ordinary camera-ready SDP changes.
assertContains(webRTCSession, "void sendSignal(peerId, { signalType: 'camera-ready' });", 'non-offering host signals camera readiness after local stream change');
assertContains(webRTCSession, 'the host turns its camera on after the original negotiation', 'host late-camera renegotiation boundary is documented');
assertContains(webRTCSession, "role === 'participant' && peerId === HOST_PEER_ID", 'participant remains designated offerer for host peer');
assertContains(webRTCSession, "signal.signalType === 'camera-ready'", 'camera-ready signal schedules offerer renegotiation');
assertContains(webRTCSession, 'if (options.iceRestart) record.connection.restartIce?.();', 'normal renegotiation never restarts ICE');
assertContains(webRTCSession, 'if (role === \'host\') return;', 'host does not emit repeated initial camera-ready bursts');
assertContains(webRTCSession, 'One bounded', 'initial participant offer retries are bounded');
assertContains(webRTCSession, "signalType: 'reconnect-request'", 'WebRTC exposes an explicit bounded reconnect signal');
assertContains(webRTCSession, "createOffer(signal.fromPeerId, { iceRestart: true })", 'an explicit retry creates a fresh ICE-backed offer');
assertContains(fastApiServer, '"reconnect-request"', 'backend authorizes reconnect only through the scoped WebRTC signal allowlist');
assertContains(hostContent, 'Retry video connection', 'host receives an actionable recovery control for a failed peer');

// A MediaStream object alone must never be presented as live video.
assertContains(hostContent, 'const hasLiveVideoFrames', 'host has a live-frame predicate');
assertContains(hostContent, "track.readyState === 'live' && !track.muted", 'host live-frame predicate requires an unmuted live track');
assertContains(hostContent, 'filter((stream) => hasLiveVideoFrames(stream))', 'host room count requires live frames');
assertContains(hostContent, 'const hasLiveParticipantVideo = hasLiveVideoFrames(remoteStream);', 'host tile label uses live-frame predicate');
assertNotContains(hostContent, "connectionStatusLabel: remoteStream\n          ? 'Live video'", 'host never labels a stream object alone as live video');
assertContains(participantView, "? 'Host camera is off'", 'mobile participant status explicitly identifies host camera off');
assertContains(participantView, "'Connecting to host camera'", 'mobile participant status distinguishes setup from host camera off');
assertContains(participantView, 'const hasLiveParticipantVideo = Boolean(remoteStream?.getVideoTracks()', 'participant tile labels require live frames');

// The room must explain normal automatic facilitator flow, not imply a manual command is required.
assertContains(participantView, 'Facilitator welcome is preparing', 'participant explains an empty transcript while welcome is generated');
assertContains(participantView, 'Facilitator reply is preparing', 'participant explains the interval after a user turn');
assertContains(participantView, 'Facilitator reply ready', 'participant exposes ready response state');
assertContains(hostMessaging, 'Welcome messages and participant replies run automatically.', 'host explains automatic normal-flow responses');
assertContains(hostMessaging, "useState<'controls' | 'transcript'>('transcript')", 'host defaults to the transcript during a live room');
assertContains(hostMessaging, 'Ask facilitator for next turn', 'host manual control is explicitly an intervention action');

// Android waiting-room content is a safe-area-aware scroll surface with optional details.
assertContains(participantLoadingShell, 'min-h-[100dvh] overflow-y-auto', 'waiting room uses a mobile-safe scroll container');
assertContains(participantLoadingShell, 'env(safe-area-inset-bottom)', 'waiting room preserves Android browser safe area');
assertContains(participantLoadingShell, '<details className="group rounded-2xl', 'nonessential session details are collapsible on mobile');

console.log('Active-session response and media contract checks passed.');
