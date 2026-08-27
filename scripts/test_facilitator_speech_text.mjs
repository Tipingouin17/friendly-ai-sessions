import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const output = await build({
  entryPoints: ['src/utils/prepareFacilitatorSpeechText.ts'],
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  target: 'node20',
});
const directory = await mkdtemp(join(tmpdir(), 'aifacilitator-speech-test-'));
const modulePath = join(directory, 'prepareFacilitatorSpeechText.mjs');

try {
  await writeFile(modulePath, output.outputFiles[0].text, 'utf8');
  const { prepareFacilitatorSpeechText } = await import(pathToFileURL(modulePath).href);
  const longLivePrompt = 'Please take a moment to reflect on the current workshop experience, identify one concrete improvement that would make participation easier, describe why it matters to your team, and explain how you would put the improvement into practice during the next session.';
  const spoken = prepareFacilitatorSpeechText(longLivePrompt);

  assert.equal(typeof spoken, 'string', 'Speech preparation must always return text.');
  assert.ok(spoken.length > 0, 'A long facilitator prompt must remain speakable.');
  assert.ok(!spoken.includes('undefined'), 'Delimiter-only sentence splits must not inject undefined into spoken text.');
  console.log('Facilitator speech text regression checks passed.');
} finally {
  await rm(directory, { recursive: true, force: true });
}
