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
const messageSaver = read('src/hooks/messageSender/useMessageSaver.ts');
const facilitatorVoice = read('src/hooks/facilitator/useFacilitatorVoice.ts');
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
const sessionTimer = read('src/hooks/useSessionTimer.ts');

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
assertContains(messageSaver, 'saveError.code = error.code;', 'message saver preserves structured backend error codes');
assertContains(messageSender, "structuredError?.code === 'message_service_busy'", 'participant sender identifies retryable message-pool pressure');
assertContains(messageSender, 'Your text is still in the box; wait a few seconds, then tap Send once.', 'participant sender preserves and explains retryable drafts');

// The first room message is availability-critical: it is persisted before any
// provider completion and can therefore never remain indefinitely in preparation.
assertContains(fastApiServer, 'claim_acquired = False', 'welcome claim has recoverable ownership tracking');
assertContains(fastApiServer, 'The first visible room message is availability-critical.', 'welcome documents its non-provider critical path');
assertContains(fastApiServer, "_used_fallback = True", 'welcome marks its deterministic opening as terminal fallback-ready');
assertContains(fastApiServer, 'Welcome to "{_session_title}"!', 'welcome uses a facilitator-specific deterministic opening');
assertContains(fastApiServer, 'async with _bounded_lifecycle_transaction(\n                start_conn,\n                "start session",', 'start-session wraps activation and welcome persistence in one bounded atomic transaction');
assertContains(fastApiServer, "INSERT INTO messages (conversation_id, content, role, name)", 'start-session writes the deterministic welcome row directly');
assertContains(fastApiServer, '"welcome": "committed"', 'start-session reports a committed rather than scheduled opening');
assertContains(fastApiServer, 'async def _broadcast_started_room()', 'start-session isolates non-durable realtime fan-out from its HTTP response');
assertContains(fastApiServer, 'asyncio.create_task(_broadcast_started_room())', 'start-session schedules realtime delivery only after its transaction commits');
assertContains(fastApiServer, 'A stale legacy WebSocket may block send_json()', 'start-session documents why lifecycle acknowledgement must not await fan-out');
assertContains(fastApiServer, 'async with _acquire_lifecycle_connection("host authorization") as conn:', 'authenticated host access remains bounded before lifecycle work begins');
assertContains(fastApiServer, 'Host authorization is part of every interactive lifecycle action.', 'host authorization documents its shared lifecycle timeout contract');
assertContains(fastApiServer, 'The acquisition budget deliberately ends before yielding.', 'lifecycle pool timeout cannot cancel caller transactions after connection acquisition');
assertContains(fastApiServer, 'async def _bounded_lifecycle_transaction', 'interactive lifecycle SQL has a transaction-scoped database timeout boundary');
assertContains(fastApiServer, "SET LOCAL statement_timeout", 'lifecycle transaction uses PostgreSQL-side query and lock budget');
assertContains(fastApiServer, 'async with _bounded_lifecycle_transaction(', 'start-session maps database transaction failures to a structured lifecycle response');
assertContains(fastApiServer, 'statement_timeout_ms=12000', 'start-session allows realistic database work while retaining a bounded query budget');
assertContains(fastApiServer, 'lock_timeout_ms=2000', 'start-session fails lock contention promptly and cleanly');
assertContains(fastApiServer, 'start_stage = {"value": "activation"}', 'start-session records a non-sensitive durable failure stage');
assertContains(fastApiServer, 'start_stage["value"] = "welcome_insert"', 'start-session identifies the welcome persistence boundary in contention recovery');
assertContains(fastApiServer, "welcome_message_status = CASE", 'start-session marks the deterministic opening ready in its initial activation update');
assertContains(fastApiServer, "ELSE 'ai_ready'", 'atomic activation makes the deterministic welcome available with a schema-supported terminal state');
assertNotContains(fastApiServer, "fallback_ready", 'start-session critical path never writes the database-incompatible fallback status');
assertContains(fastApiServer, '"code": code', 'lifecycle database failures return structured retryable error codes');
assertNotContains(fastApiServer, 'await _maybe_generate_welcome_message(start_conversation_id)', 'start-session never relies on detached welcome generation');
assertContains(fastApiServer, 'reason": "start_session_endpoint_required"', 'legacy session-start compatibility calls cannot schedule a competing welcome');
assertContains(fastApiServer, 'welcome stale-claim recovery', 'a stale generating claim converges to ready when the committed opening exists');
assertContains(fastApiServer, "WHERE NOT EXISTS (SELECT 1 FROM messages WHERE conversation_id = $1 AND role = 'assistant')", 'a pre-start welcome claimant cannot insert a duplicate after atomic host start');
assertContains(fastApiServer, "'ai_ready',", 'welcome fallback persists the schema-supported ready terminal status');
assertContains(fastApiServer, "WHERE id = $1 AND welcome_message_status = 'ai_generating'", 'welcome failure releases only its active generation claim');
assertNotContains(fastApiServer, '_oai_client_welcome', 'welcome must not wait on a provider client');
assertContains(fastApiServer, 'FACILITATOR_PROVIDER_TIMEOUT_SECONDS = 15', 'facilitator reply has an explicit provider timeout');
assertContains(fastApiServer, 'timeout=FACILITATOR_PROVIDER_TIMEOUT_SECONDS', 'facilitator reply bounds both provider work and client resolution');
assertContains(fastApiServer, '_oai_client_bg = await asyncio.wait_for(', 'facilitator reply resolves configured provider client inside the guarded boundary');
assertContains(fastApiServer, 'facilitator provider returned an empty response', 'empty provider reply output falls back');
assertContains(fastApiServer, 'provider unavailable for conv=%s; persisting fallback', 'reply provider failure produces persisted fallback copy');
assertContains(fastApiServer, 'INSERT INTO messages (conversation_id, content, role, name, ', 'assistant fallback uses the standard persisted messages contract');
assertContains(fastApiServer, 'manager.broadcast(str(conv_id)', 'persisted assistant fallback broadcasts to room clients');
assertContains(fastApiServer, 'FACILITATOR_SELECTOR_TIMEOUT_SECONDS = 10', 'optional technique selection has a bounded timeout independent of the reply provider');
assertContains(fastApiServer, 'asyncio.to_thread(\n                _compress_messages_for_context,', 'selector compression cannot block the event loop before a facilitator reply');
assertContains(fastApiServer, 'Technique selector preparation failed; using safe open discussion fallback', 'selector preparation failures converge to deterministic open discussion');
assertContains(fastApiServer, 'await asyncio.wait_for(\n                _select_facilitation_technique(', 'main continuation bounds optional technique selection before response generation');
assertContains(fastApiServer, 'Technique selection unavailable; continuing with safe open discussion', 'main continuation uses a deterministic selector fallback on timeout or error');
assertContains(fastApiServer, 'async def _persist_facilitator_continuation_fallback', 'unexpected post-answer failures have a dedicated durable recovery boundary');
assertContains(fastApiServer, "'deterministic-fallback'", 'continuation recovery uses a traceable standard assistant fallback model marker');
assertContains(fastApiServer, "WHERE conversation_id = $1 AND role = 'assistant' AND id > $4", 'continuation recovery is idempotent when a normal assistant turn already exists');
assertContains(fastApiServer, 'if _response_lock_acquired:\n            await _persist_facilitator_continuation_fallback(', 'post-answer continuation errors persist visible recovery text rather than only logging');
assertContains(fastApiServer, 'def _schedule_post_insert_session_work(table: str, rows: list[dict[str, Any]])', 'post-insert session scheduling is isolated from broadcast envelope routing');
assertContains(fastApiServer, 'REST POST /messages -> scheduling AI facilitator continuation', 'normal persisted user messages visibly schedule the server-owned continuation');
assertContains(fastApiServer, 'SELECT runtime_cfg.tts_avatar_enabled\n                           FROM configurations runtime_cfg\n                           LIMIT 1', 'continuation context uses the schema-supported global runtime configuration row');
assertNotContains(fastApiServer, 'cfg.user_id = s.user_id', 'continuation context never assumes a nonexistent per-user configurations column');
assertContains(fastApiServer, 'stored_participant_capacity = int(row.get("participants") or 1)', 'continuation captures the stored host-inclusive capacity explicitly');
assertContains(fastApiServer, 'expected_participants = max(1, stored_participant_capacity - 1)', 'continuation waits for attendee responses rather than host-inclusive stored capacity');
assertContains(fastApiServer, 'responses=%d/%d attendees (stored_capacity=%d)', 'continuation logs normalized attendee threshold diagnostics');
assertContains(fastApiServer, '_schedule_post_insert_session_work(table, results)', 'batch inserts invoke shared post-insert scheduling after broadcast routing');
assertContains(fastApiServer, '_schedule_post_insert_session_work(table, [result])', 'single-row inserts invoke shared post-insert scheduling after broadcast routing');
assertNotContains(fastApiServer, 'if table == "messages" and conv_id and result.get("role") == "user":', 'continuation scheduling is not trapped inside the mode-session broadcast branch');

// Tokenized REST requests must never acquire a second connection while already
// holding their request-scoped pool connection; that self-starved Android reads.
assertContains(fastApiServer, 'async def _acquire_interactive_message_connection', 'participant messages have a bounded interactive acquisition path');
assertContains(fastApiServer, 'busy_code="message_service_busy"', 'participant message pressure returns a structured retryable code');
assertContains(fastApiServer, '_acquire_interactive_message_connection("participant message write")', 'tokenized participant REST messages use bounded acquisition');
assertContains(fastApiServer, 'conn: asyncpg.Connection | None = None', 'join-token validation accepts a request-scoped connection');
assertContains(fastApiServer, 'if not await _validate_join_token(join_token_header, conversation_id, conn):', 'participant message authorization reuses the request connection');
assertNotContains(fastApiServer, 'IMPORTANT: Always acquires its own connection from the pool', 'join-token validator no longer documents unsafe nested acquisition');
assertContains(fastApiServer, 'The budget applies only while waiting for a pool slot.', 'interactive reads and messages bound acquisition without cancelling owned work');
assertContains(fastApiServer, '_pool_pressure_snapshot()', 'pool-pressure diagnostics are retained for future operational triage');

// Server-configured participant voice is explicitly ElevenLabs-only: never a
// hidden browser speech fallback, and stale synthesis work cannot replay.
assertContains(facilitatorVoice, 'const playbackGenerationRef = React.useRef(0);', 'server voice tracks a playback generation');
assertContains(facilitatorVoice, 'playbackGenerationRef.current += 1;', 'cancellation invalidates stale server audio work');
assertContains(facilitatorVoice, 'if (!isCurrentGeneration()) {', 'server TTS ignores stale async synthesis results');
assertContains(facilitatorVoice, 'fallbackDisabled: true', 'server TTS failure records that browser fallback is disabled');
assertNotContains(facilitatorVoice, "fallbackTo: 'browser_speech_synthesis'", 'server-configured TTS never silently falls back to browser speech');
assertContains(facilitatorVoice, 'ElevenLabs voice is temporarily unavailable.', 'server TTS failures are visible and retryable');
assertContains(facilitatorVoice, 'const audioContextRef = React.useRef<AudioContext | null>(null);', 'server voice retains a Web Audio context after the enable gesture');
assertContains(facilitatorVoice, 'const audioBufferSourceRef = React.useRef<AudioBufferSourceNode | null>(null);', 'server voice can cancel a decoded Android audio source');
assertContains(facilitatorVoice, 'const getUnlockedAudioContext = React.useCallback', 'server voice obtains the retained user-gesture-resumed context');
assertContains(facilitatorVoice, 'context.decodeAudioData(serverResult.audioData.slice(0))', 'server voice decodes the exact ElevenLabs bytes through Web Audio');
assertContains(facilitatorVoice, "deliveryPath: 'web_audio'", 'server voice records its preferred Android delivery path');
assertContains(facilitatorVoice, "new Blob([serverResult.audioData], { type: 'audio/mpeg' })", 'HTMLMedia compatibility fallback uses the same ElevenLabs MP3 bytes');
assertContains(facilitatorVoice, 'mediaErrorCode: mediaErrorCode ?? null', 'server playback failures retain a non-sensitive concrete media diagnostic');
assertNotContains(facilitatorVoice, "unlocked = context.state === 'running';\n        void context.close();", 'the audio-enable gesture does not close the context needed for delayed Android playback');
assertContains(facilitatorVoice, "if (context && context.state !== 'closed') void context.close();", 'the retained context is closed only during hook cleanup');
assertContains(participantView, 'Enable ElevenLabs audio', 'mobile participant sees the configured provider in the permission action');
assertContains(participantView, 'manualReplayInProgressRef', 'mobile replay has a synchronous pre-render tap guard');
assertContains(participantView, 'disabled={isAudioPlaybackBusy}', 'mobile replay is disabled while preparing or playing');
assertNotContains(participantView, 'line-clamp-4 text-xs leading-relaxed text-slate-700', 'mobile chat never truncates a facilitator message after four lines');
assertContains(participantView, 'whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-700', 'mobile chat preserves full wrapped text');
assertNotContains(participantView, 'max-h-[42dvh] min-h-[180px] overflow-y-auto overscroll-contain', 'mobile chat is never capped into a separate card above the composer');
assertContains(participantView, 'flex min-h-0 flex-1 flex-col gap-2 p-2 md:hidden', 'mobile participant shell owns one flexible primary viewport');
assertContains(participantView, "renderChatPanel('mobile-primary')", 'mobile chat is rendered in the primary flexible viewport');
assertContains(participantView, "renderPeoplePanel('mobile-primary')", 'people and video reuse the primary viewport rather than adding a second stacked card');
assertContains(participantView, 'renderParticipantComposer(true)', 'mobile reply dock is rendered immediately after the primary viewport');
assertContains(inputFooter, 'Reply to the discussion', 'mobile reply dock has a clear primary-task label');
assertContains(participantView, 'Session details', 'secondary session context uses a single explicit progressive-disclosure control');
assertContains(participantView, "audioUnlocked && voiceRuntime.playbackState === 'idle' ? 'hidden md:block'", 'ready audio guidance compacts on phones after the initial enable action');
assertContains(participantView, 'className="hidden mt-2 grid grid-cols-2 gap-2 md:hidden"', 'duplicate mobile camera-state cards do not consume the initial reply viewport');
assertContains(inputFooter, 'compactParticipantDock?: boolean;', 'input footer supports the participant phone reply dock without a second composer implementation');
assertContains(inputFooter, 'aria-label="Reply composer"', 'compact phone composer remains discoverable to assistive technology');

// A full room may become ready, but only the host may call the atomic start endpoint.
assertNotContains(autoStartSession, 'await onStartSession()', 'legacy auto-start hook cannot call the host start operation');
assertNotContains(autoStartSession, 'autoStartTimeoutRef', 'legacy auto-start timer has been removed');
assertNotContains(hostLogic, 'void triggerAutoStart(', 'host capacity callbacks never initiate session start');
assertNotContains(sessionState, 'setSessionStarted(true)', 'participant capacity state cannot locally mark the room live');
assertContains(sessionTimer, 'runtime_started_at', 'live timer prefers the persisted host-start timestamp over workshop creation time');
assertContains(sessionTimer, 'const startAt = runtimeStartedAt ?? conversation.created_at;', 'historical sessions retain a creation-time fallback only when no runtime start exists');
assertContains(fastApiServer, "'{runtime_started_at}'", 'atomic start records a schema-supported runtime start timestamp');
assertContains(hostContent, 'currentParticipantCount={reconciledParticipantCount}', 'active host panel uses the reconciled attendee count');
assertContains(hostContent, 'maxParticipants={maxParticipants}', 'active host panel uses attendee capacity rather than host-inclusive storage');
assertContains(sessionContainer, 'const attendeeCapacity = Math.max(1, participantCount - 1)', 'participant active-room capacity normalizes host-inclusive stored capacity');
assertContains(sessionContainer, 'maxParticipants={attendeeCapacity}', 'participant active-room header receives attendee-only capacity');

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
assertContains(participantView, "const hostCameraState = remoteCameraStates[HOST_VIDEO_STREAM_KEY] ?? 'off'", 'participant defaults an absent camera catch-up signal to host camera off');
assertContains(participantView, "hostCameraState === 'off'", 'participant host label uses explicit camera-off state before generic connection status');
assertContains(participantView, "? 'Host camera is off'", 'mobile participant status explicitly identifies host camera off');
assertContains(participantView, "'Connecting to host camera'", 'mobile participant status distinguishes setup from host camera off');
assertContains(webRTCSession, "remoteCameraStates: Record<string, 'on' | 'off'>", 'WebRTC exposes explicit remote camera availability to parent media UI');
assertContains(webRTCSession, "const signalType: WebRTCSignalType = localStream ? 'camera-ready' : 'camera-stopped'", 'host announces both initial camera-on and camera-off state to participant peers');
assertContains(webRTCSession, 'WEBRTC_CAMERA_READY_STALE_MS = WEBRTC_ICE_STALL_TIMEOUT_MS', 'camera-ready without frames has a bounded negotiation grace period');
assertContains(webRTCSession, "previous[streamKey] === 'on' ? { ...previous, [streamKey]: 'off' } : previous", 'stale camera-ready state becomes off when no live remote frames arrive');
assertContains(webRTCSession, "track.kind === 'video' && track.readyState === 'live' && !track.muted", 'remote camera availability requires a live unmuted video track rather than any receiver track');
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
