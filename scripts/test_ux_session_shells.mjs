import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const repoRoot = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

const participantView = read('src/components/session/messaging/ParticipantMessagingView.tsx');
const hostContent = read('src/components/session/host/HostSessionContent.tsx');
const stylesheet = read('src/index.css');

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
assertContains(participantView, 'Your response is registered', 'participant visible response confirmation');
assertContains(participantView, "type SidebarTab = 'people' | 'chat'", 'participant people/chat sidebar contract');
assertContains(participantView, 'animate-sound-bar', 'participant AI speaking visualization');
assertContains(participantView, '<InputFooter', 'participant preserved composer integration');
assertContains(participantView, 'submitModeInput={submitModeInput}', 'participant mode input plumbing');
assertContains(participantView, 'speechEnabled={speechStackEnabled}', 'participant speech runtime plumbing');

assertContains(hostContent, 'PanelGroup direction="horizontal"', 'host resizable command center');
assertContains(hostContent, 'bg-slate-50 p-3 text-slate-950', 'host light command-center surface');
assertContains(hostContent, 'Participant intelligence', 'host participant intelligence rail');
assertContains(hostContent, 'Session pulse', 'host pulse panel');
assertContains(hostContent, '<SimplifiedHostMessagingView', 'host preserved control surface');
assertContains(hostContent, 'onApproveMode={onApproveMode}', 'host mode approval plumbing');
assertNotContains(hostContent, "UX handoff's dark", 'host design documentation');
assertNotContains(participantView, 'Precision Dark', 'participant design documentation');

assertContains(stylesheet, "font-family: 'Sora'", 'Signal & Clarity display font token');
assertContains(stylesheet, '@keyframes aiSpeakingPulse', 'AI speaking pulse animation');
assertContains(stylesheet, '@keyframes soundBar', 'sound bar animation');

console.log('UX session shell regression checks passed.');
