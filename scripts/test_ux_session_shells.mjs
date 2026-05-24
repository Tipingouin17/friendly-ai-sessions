import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const repoRoot = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

const participantView = read('src/components/session/messaging/ParticipantMessagingView.tsx');
const hostContent = read('src/components/session/host/HostSessionContent.tsx');
const stylesheet = read('src/index.css');
const videoGrid = read('src/components/session/video/SessionVideoGrid.tsx');
const vercelConfig = read('vercel.json');

const assertContains = (source, needle, label) => {
  assert.ok(source.includes(needle), `${label} should include ${needle}`);
};

const assertNotContains = (source, needle, label) => {
  assert.ok(!source.includes(needle), `${label} should not include ${needle}`);
};

assertContains(participantView, 'AI spotlight', 'participant view documentation');
assertContains(participantView, 'bg-slate-50 text-slate-950', 'participant light shell surface');
assertContains(participantView, 'Current question', 'participant current-question card');
assertContains(participantView, 'latestOwnParticipantMessage', 'participant registered-response derivation');
assertContains(participantView, 'String(message.participant) === participantKey', 'participant response registration tolerates numeric participant ids');
assertContains(participantView, 'Your response is registered', 'participant visible response confirmation');
assertContains(participantView, 'effectiveResponseCount', 'participant response counter uses local registration fallback');
assertContains(participantView, 'Math.max(responseCount, hasRegisteredResponse ? 1 : 0)', 'participant local response counter does not remain at zero after own reply registers');
assertContains(participantView, "type SidebarTab = 'people' | 'chat'", 'participant people/chat sidebar contract');
assertContains(participantView, '<SessionVideoGrid', 'participant People tab multi-video grid integration');
assertContains(participantView, 'variant="participant-sidebar"', 'participant sidebar video grid variant');
assertContains(participantView, 'participantVideoTiles', 'participant data-driven video tile mapping');
assertContains(participantView, 'navigator.mediaDevices.getUserMedia', 'participant local camera permission request');
assertContains(participantView, 'localCameraStreamRef.current.getTracks().forEach((track) => track.stop())', 'participant local camera stream cleanup');
assertContains(participantView, 'data-camera-toggle="participant-local-preview"', 'participant header camera toggle marker');
assertContains(participantView, 'mediaStream: participant.id === effectiveParticipantId ? localCameraStream : null', 'participant self tile receives local preview stream');
assertContains(participantView, 'Camera access was blocked', 'participant camera permission feedback');
assertContains(participantView, 'animate-sound-bar', 'participant AI speaking visualization');
assertContains(participantView, '<InputFooter', 'participant preserved composer integration');
assertContains(participantView, 'submitModeInput={submitModeInput}', 'participant mode input plumbing');
assertContains(participantView, 'speechEnabled={speechStackEnabled}', 'participant speech runtime plumbing');

assertContains(hostContent, 'PanelGroup direction="horizontal"', 'host resizable command center');
assertContains(hostContent, 'bg-slate-50 p-3 text-slate-950', 'host light command-center surface');
assertContains(hostContent, 'Participant intelligence', 'host participant intelligence rail');
assertContains(hostContent, 'Session pulse', 'host pulse panel');
assertContains(hostContent, '<SimplifiedHostMessagingView', 'host preserved control surface');
assertContains(hostContent, 'Video room', 'host multi-video room section');
assertContains(hostContent, "videoLayout === 'gallery'", 'host gallery-mode toggle');
assertContains(hostContent, '<SessionVideoTile', 'host spotlight video tile');
assertContains(hostContent, 'variant="host-strip"', 'host participant thumbnail strip');
assertContains(hostContent, 'showResponseStatus', 'host response status badges on video tiles');
assertContains(hostContent, 'onApproveMode={onApproveMode}', 'host mode approval plumbing');
assertNotContains(hostContent, "UX handoff's dark", 'host design documentation');
assertNotContains(participantView, 'Precision Dark', 'participant design documentation');

assertContains(stylesheet, "font-family: 'Sora'", 'Signal & Clarity display font token');
assertContains(stylesheet, '@keyframes aiSpeakingPulse', 'AI speaking pulse animation');
assertContains(stylesheet, '@keyframes soundBar', 'sound bar animation');
assertContains(stylesheet, '@keyframes reactionPop', 'video reaction badge animation');

assertContains(videoGrid, 'mediaStream?: MediaStream | null', 'video tile optional live stream support');
assertContains(videoGrid, 'srcObject = stream', 'video tile MediaStream binding');
assertContains(videoGrid, 'srcObject = null', 'video tile MediaStream detaches on unmount');
assertContains(videoGrid, 'aria-label={`${name} live video`}', 'video tile accessible live preview label');
assertContains(videoGrid, "data-session-video-grid", 'video grid semantic marker');
assertContains(videoGrid, "data-video-tile-variant", 'video tile variant semantic marker');
assertContains(videoGrid, "variant?: 'participant-sidebar' | 'host-strip' | 'host-gallery'", 'video grid supported layout variants');
assertContains(vercelConfig, 'camera=(self)', 'deployed permissions policy allows same-origin participant camera preview');

console.log('UX session shell regression checks passed.');
