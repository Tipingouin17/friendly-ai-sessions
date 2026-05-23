#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const outDir = join(tmpdir(), 'friendly-ai-sessions-tests');
const outFile = join(outDir, 'streamInterpreter.test.mjs');
const esbuildBin = join(repoRoot, 'node_modules', '.bin', process.platform === 'win32' ? 'esbuild.cmd' : 'esbuild');
const testFile = join(repoRoot, 'tests', 'facilitator', 'streamInterpreter.test.ts');

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: false,
    ...options,
  });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

mkdirSync(outDir, { recursive: true });

run(esbuildBin, [
  testFile,
  '--bundle',
  '--platform=node',
  '--format=esm',
  `--outfile=${outFile}`,
]);

run(process.execPath, ['--test', outFile]);

rmSync(outFile, { force: true });
