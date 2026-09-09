/** @jest-environment node */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createSettingsStore } from '../lib/settingsStore';

describe('settings store', () => {
  let directory: string;

  beforeEach(() => { directory = mkdtempSync(path.join(os.tmpdir(), 'chematic-settings-')); });
  afterEach(() => { rmSync(directory, { recursive: true, force: true }); });

  it('persists settings atomically and validates the supported values', () => {
    const store = createSettingsStore(directory);
    expect(store.isSafeKey('theme')).toBe(true);
    expect(store.isSafeKey('__proto__')).toBe(false);
    expect(store.isSafeValue('theme', 'dark')).toBe(true);
    expect(store.isSafeValue('theme', 'neon')).toBe(false);
    store.save({ theme: 'dark', recentFiles: ['/tmp/example.mol'] });
    expect(store.load()).toEqual({ theme: 'dark', recentFiles: ['/tmp/example.mol'] });
    expect(readFileSync(path.join(directory, 'settings.json'), 'utf8')).toContain('"theme": "dark"');
  });

  it('returns an empty object for malformed or array-shaped files', () => {
    const store = createSettingsStore(directory);
    writeFileSync(path.join(directory, 'settings.json'), '{malformed', 'utf8');
    expect(store.load()).toEqual({});
    writeFileSync(path.join(directory, 'settings.json'), '[]', 'utf8');
    expect(store.load()).toEqual({});
  });
});
