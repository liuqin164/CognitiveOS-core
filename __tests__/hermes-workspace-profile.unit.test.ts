import { expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { HermesWorkspaceProfile } from '../src/adapters/hermes/HermesWorkspaceProfile.js';

test('HermesWorkspaceProfile maps sessions and profile into source definitions', () => {
  const root = mkdtempSync(join(tmpdir(), 'hermes-profile-'));
  mkdirSync(join(root, 'sessions', '2026'), { recursive: true });
  writeFileSync(join(root, 'profile.md'), '# Profile\nPrefers concise plans.');
  writeFileSync(join(root, 'sessions', '2026', '05-07.md'), 'User: Remember the release gate.\nAgent: Stored.');

  const profile = new HermesWorkspaceProfile(root);
  const sources = profile.buildSourceDefinitions({ projectId: 'hermes' });

  expect(sources.length).toBe(2);
  expect(sources.map((source) => source.adapterKind)).toContain('soul_markdown');
  expect(sources.map((source) => source.adapterKind)).toContain('conversation_markdown');
  expect(sources.every((source) => source.projectId === 'hermes')).toBe(true);
});

test('HermesWorkspaceProfile supports explicit profile and session directories', () => {
  const root = mkdtempSync(join(tmpdir(), 'hermes-profile-'));
  mkdirSync(join(root, 'logs'), { recursive: true });
  writeFileSync(join(root, 'identity.md'), '# Identity\nActs as Hermes.');
  writeFileSync(join(root, 'logs', 'session.md'), 'Human: Use sqlite-vec.\nAssistant: Stored.');

  const profile = new HermesWorkspaceProfile(root);
  const sources = profile.buildSourceDefinitions({
    projectId: 'custom-hermes',
    profilePath: 'identity.md',
    sessionDir: 'logs',
  });

  expect(sources.map((source) => source.sourcePath).some((path) => path.endsWith('identity.md'))).toBe(true);
  expect(sources.map((source) => source.sourcePath).some((path) => path.endsWith('session.md'))).toBe(true);
});

test('HermesWorkspaceProfile includes state.db when Hermes stores messages in SQLite', () => {
  const root = mkdtempSync(join(tmpdir(), 'hermes-profile-state-db-'));
  writeFileSync(join(root, 'state.db'), 'sqlite placeholder');

  const profile = new HermesWorkspaceProfile(root);
  const sources = profile.buildSourceDefinitions({ projectId: 'hermes' });
  const stateDb = sources.find((source) => source.sourcePath.endsWith('state.db'));

  expect(stateDb).toBeDefined();
  expect(stateDb?.adapterKind).toBe('hermes_state_db');
  expect(stateDb?.metadata?.hermesSourceClass).toBe('state_db');
});
