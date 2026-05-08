import { expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { OpenClawWorkspaceProfile } from '../src/adapters/openclaw/OpenClawWorkspaceProfile.js';

test('OpenClawWorkspaceProfile builds default source definitions', () => {
  const root = mkdtempSync(join(tmpdir(), 'openclaw-profile-'));
  mkdirSync(join(root, 'memory'), { recursive: true });
  writeFileSync(join(root, 'USER.md'), '# User\nPrefers direct answers.');
  writeFileSync(join(root, 'SOUL.md'), '# Soul\nActs as a coding agent.');
  writeFileSync(join(root, 'memory', '2026-05-07.md'), 'User: Use Bun.\nAgent: Confirmed.');

  const profile = new OpenClawWorkspaceProfile(root);
  const selection = profile.buildInstalledBatchSelection({ projectId: 'demo' });

  expect(selection.sources.map((source) => source.adapterKind)).toContain('openclaw_user_profile');
  expect(selection.sources.map((source) => source.adapterKind)).toContain('openclaw_persona');
  expect(selection.sources.map((source) => source.adapterKind)).toContain('openclaw_daily_memory');
  expect(selection.sources.every((source) => source.projectId === 'demo')).toBe(true);
});

test('OpenClawWorkspaceProfile ignores operational bootstrap files by default', () => {
  const root = mkdtempSync(join(tmpdir(), 'openclaw-profile-'));
  writeFileSync(join(root, 'AGENTS.md'), '# Agent instructions');

  const profile = new OpenClawWorkspaceProfile(root);
  const classification = profile.classifyPath(join(root, 'AGENTS.md'));

  expect(classification.classification).toBe('operational_ignore');
  expect(classification.adapterKind).toBeUndefined();
});
