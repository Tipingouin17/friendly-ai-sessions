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
const webRTCSession = read('src/hooks/useWebRTCSession.ts');
const fastApiServer = read('supabase_proxy/server_fastapi.py');

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

// AI-provider failure always produces a visible assistant fallback instead of stuck generation.
assertContains(fastApiServer, 'claim_acquired = False', 'welcome claim has recoverable ownership tracking');
assertContains(fastApiServer, '_oai_client_welcome = await _get_openai_client(_model)', 'welcome still resolves configured provider client');
assertContains(fastApiServer, "_used_fallback = True", 'welcome marks provider fallback explicitly');
assertContains(fastApiServer, "'fallback_ready' if _used_fallback else 'ai_ready'", 'welcome persists a terminal fallback-ready status');
assertContains(fastApiServer, "WHERE id = $1 AND welcome_message_status = 'ai_generating'", 'welcome failure releases only its active generation claim');
assertContains(fastApiServer, 'welcome provider returned an empty response', 'empty provider welcome output falls back');
assertContains(fastApiServer, '_oai_client_bg = await _get_openai_client(_model)', 'facilitator reply resolves configured provider client inside guarded boundary');
assertContains(fastApiServer, 'facilitator provider returned an empty response', 'empty provider reply output falls back');
assertContains(fastApiServer, 'provider unavailable for conv=%s; persisting fallback', 'reply provider failure produces persisted fallback copy');
assertContains(fastApiServer, 'INSERT INTO messages (conversation_id, content, role, name, ', 'assistant fallback uses the standard persisted messages contract');
assertContains(fastApiServer, 'manager.broadcast(str(conv_id)', 'persisted assistant fallback broadcasts to room clients');

// Host camera changes must request renegotiation from the designated participant offerer.
assertContains(webRTCSession, "void sendSignal(peerId, { signalType: 'camera-ready' });", 'non-offering host signals camera readiness after local stream change');
assertContains(webRTCSession, 'the host turns its camera on after the original negotiation', 'host late-camera renegotiation boundary is documented');
assertContains(webRTCSession, "role === 'participant' && peerId === HOST_PEER_ID", 'participant remains designated offerer for host peer');
assertContains(webRTCSession, "signal.signalType === 'camera-ready'", 'camera-ready signal schedules offerer renegotiation');

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
assertContains(hostMessaging, 'Ask facilitator for next turn', 'host manual control is explicitly an intervention action');

console.log('Active-session response and media contract checks passed.');
