import { test, expect, _electron as electron } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

const ELECTRON_DIR = path.resolve(__dirname, '..', '..');

// main.js's checkAutosaveRecovery() shows a native OS "Restore?" dialog that
// Playwright can't click (no CDP access outside the web content) — these
// tests answer it via CHEMATIC_E2E_AUTOSAVE_ANSWER, a seam that's a no-op
// unless a test sets it (see main.js).
//
// Every launch here also gets its own --user-data-dir (a standard Chromium
// switch Electron's app.getPath('userData') respects). Without it, every
// electron-smoke launch — including app.smoke.ts and pdf-export.smoke.ts,
// which know nothing about autosave.json — shares one real OS userData
// directory; a concurrent launch from another file can trigger
// checkAutosaveRecovery() on the snapshot a test here just wrote and delete
// it before this file's own launch gets to read it. Isolating the directory
// removes the shared mutable global instead of just serializing around it,
// so this file no longer needs (or gets any benefit from) serial mode.
const launch = (extraEnv: Record<string, string> = {}) =>
  electron.launch({
    args: [`--user-data-dir=${userDataDir}`, ELECTRON_DIR],
    env: { ...process.env, ...extraEnv },
  });

let userDataDir: string;

// The 3 tests below still share one userDataDir/autosave.json with each
// other (cheaper than a fresh temp dir per test, and each test asserts the
// file is gone again by the time it finishes) — so, unlike isolation from
// other files, ordering between these three still matters.
test.describe.configure({ mode: 'serial' });

test.describe('Autosave / crash recovery', () => {
  let autosavePath: string;

  test.beforeAll(() => {
    userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chematic-autosave-test-'));
    autosavePath = path.join(userDataDir, 'autosave.json');
  });

  test.afterAll(() => {
    fs.rmSync(userDataDir, { recursive: true, force: true });
  });

  test('confirming the prompt restores the snapshot and consumes the file', async () => {
    // Simulates what a crashed previous run leaves behind — a snapshot
    // distinguishable (1 atom, 0 bonds) from the benzene sample (6a, 6b)
    // that loads when there's nothing to recover.
    const snapshot = {
      molecule: { atoms: [{ id: 0, element: 'C', x: 0, y: 0, charge: 0, atom_map: 0 }], bonds: [] },
      filePath: null,
    };
    fs.writeFileSync(autosavePath, JSON.stringify(snapshot), 'utf-8');

    const electronApp = await launch({ CHEMATIC_E2E_AUTOSAVE_ANSWER: 'restore' });
    const window = await electronApp.firstWindow();
    await expect(window.getByTestId('app-root')).toHaveAttribute('data-ready', 'true', {
      timeout: 15000,
    });

    await expect(window.getByText(/^1a • 0b/)).toBeVisible({ timeout: 10000 });

    // Consumed the moment checkAutosaveRecovery() read it — restoring
    // doesn't leave the file behind to re-prompt on the next launch.
    expect(fs.existsSync(autosavePath)).toBe(false);

    await electronApp.close();
  });

  test('discarding the prompt clears the snapshot and loads the normal sample', async () => {
    const snapshot = {
      molecule: { atoms: [{ id: 0, element: 'C', x: 0, y: 0, charge: 0, atom_map: 0 }], bonds: [] },
      filePath: null,
    };
    fs.writeFileSync(autosavePath, JSON.stringify(snapshot), 'utf-8');

    const electronApp = await launch({ CHEMATIC_E2E_AUTOSAVE_ANSWER: 'discard' });
    const window = await electronApp.firstWindow();
    await expect(window.getByTestId('app-root')).toHaveAttribute('data-ready', 'true', {
      timeout: 15000,
    });

    await expect(window.getByText(/^6a • 6b/)).toBeVisible({ timeout: 10000 });
    expect(fs.existsSync(autosavePath)).toBe(false);

    await electronApp.close();
  });

  test('autosave:write is atomic and before-quit clears it on a clean exit', async () => {
    expect(fs.existsSync(autosavePath)).toBe(false);

    const electronApp = await launch();
    const window = await electronApp.firstWindow();
    await expect(window.getByTestId('app-root')).toHaveAttribute('data-ready', 'true', {
      timeout: 15000,
    });

    const molecule = { atoms: [{ id: 0, element: 'N', x: 0, y: 0, charge: 0, atom_map: 0 }], bonds: [] };
    const result = await window.evaluate(
      ({ molecule }) =>
        (
          window as unknown as {
            electronAPI: { autosaveWrite: (m: unknown, f: string | null) => Promise<{ success: boolean }> };
          }
        ).electronAPI.autosaveWrite(molecule, '/tmp/whatever.mol'),
      { molecule }
    );
    expect(result.success).toBe(true);
    expect(fs.existsSync(autosavePath)).toBe(true);
    expect(fs.existsSync(`${autosavePath}.tmp`)).toBe(false); // rename cleaned it up

    const written = JSON.parse(fs.readFileSync(autosavePath, 'utf-8'));
    expect(written.molecule.atoms).toEqual(molecule.atoms);
    expect(written.filePath).toBe('/tmp/whatever.mol');

    await electronApp.close();
    expect(fs.existsSync(autosavePath)).toBe(false);
  });

  test('autosave:write rejects an invalid molecule at the IPC boundary', async () => {
    expect(fs.existsSync(autosavePath)).toBe(false);
    const electronApp = await launch();
    const window = await electronApp.firstWindow();
    await expect(window.getByTestId('app-root')).toHaveAttribute('data-ready', 'true', {
      timeout: 15000,
    });

    const result = await window.evaluate(() => {
      const api = (window as unknown as {
        electronAPI: { autosaveWrite: (m: unknown, f: string | null) => Promise<{ success: boolean; error?: string }> }
      }).electronAPI;
      return api.autosaveWrite({ atoms: [{ id: 0, element: 'C', x: 0, y: 0, charge: 0.5, atom_map: 0 }], bonds: [] }, null);
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('invalid');
    expect(fs.existsSync(autosavePath)).toBe(false);

    await electronApp.close();
  });

  test('autosave:write rejects duplicate bond IDs at the IPC boundary', async () => {
    expect(fs.existsSync(autosavePath)).toBe(false);
    const electronApp = await launch();
    const window = await electronApp.firstWindow();
    await expect(window.getByTestId('app-root')).toHaveAttribute('data-ready', 'true', {
      timeout: 15000,
    });

    const result = await window.evaluate(() => {
      const api = (window as unknown as {
        electronAPI: { autosaveWrite: (m: unknown, f: string | null) => Promise<{ success: boolean; error?: string }> }
      }).electronAPI;
      return api.autosaveWrite({
        atoms: [
          { id: 1, element: 'C', x: 0, y: 0, charge: 0, atom_map: 0 },
          { id: 2, element: 'C', x: 1, y: 0, charge: 0, atom_map: 0 },
        ],
        bonds: [
          { id: 7, from: 1, to: 2, order: 1, stereo: 0 },
          { id: 7, from: 1, to: 2, order: 1, stereo: 0 },
        ],
      }, null);
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/invalid or oversized molecule/i);
    expect(fs.existsSync(autosavePath)).toBe(false);

    await electronApp.close();
  });
});

// The three tests above cover write and restore as separate halves: writing
// is checked against a hand-crafted snapshot file, and restoring reads a
// snapshot this suite wrote with fs.writeFileSync rather than the app's own
// autosave:write handler. Neither exercises the actual round trip the
// feature exists for — a real write, followed by a real crash, followed by
// a real restore of that exact snapshot. This closes that gap with its own
// isolated userDataDir so it can't interleave with the serial block above.
test.describe('Autosave / crash recovery — real write-then-restore round trip', () => {
  let roundTripUserDataDir: string;
  let roundTripAutosavePath: string;

  test.beforeAll(() => {
    roundTripUserDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chematic-autosave-roundtrip-'));
    roundTripAutosavePath = path.join(roundTripUserDataDir, 'autosave.json');
  });

  test.afterAll(() => {
    fs.rmSync(roundTripUserDataDir, { recursive: true, force: true });
  });

  test('a snapshot written via autosave:write survives a crash and restores on relaunch', async () => {
    const firstApp = await electron.launch({
      args: [`--user-data-dir=${roundTripUserDataDir}`, ELECTRON_DIR],
      env: process.env,
    });
    const firstWindow = await firstApp.firstWindow();
    await expect(firstWindow.getByTestId('app-root')).toHaveAttribute('data-ready', 'true', {
      timeout: 15000,
    });

    // Distinctive from both the 6a•6b default sample and the 1a•0b fixture
    // used above, and written through the real IPC handler this time.
    const molecule = {
      atoms: [
        { id: 0, element: 'C', x: 0, y: 0, charge: 0, atom_map: 0 },
        { id: 1, element: 'O', x: 1, y: 0, charge: 0, atom_map: 0 },
      ],
      bonds: [{ id: 0, from: 0, to: 1, order: 1, stereo: 0 }],
    };
    const result = await firstWindow.evaluate(
      ({ molecule }) =>
        (
          window as unknown as {
            electronAPI: { autosaveWrite: (m: unknown, f: string | null) => Promise<{ success: boolean }> };
          }
        ).electronAPI.autosaveWrite(molecule, null),
      { molecule }
    );
    expect(result.success).toBe(true);
    expect(fs.existsSync(roundTripAutosavePath)).toBe(true);

    // SIGKILL, not close() or a plain kill(): a clean quit — and Electron
    // treats a plain SIGTERM as one, running its default quit handling —
    // runs before-quit, which always clears the snapshot (that's the
    // "clean exit" case the third test above already covers). SIGKILL
    // can't be intercepted, so it simulates the actual crash the recovery
    // feature exists for: the process disappears with no chance to clean
    // up, leaving the snapshot behind for next launch to find.
    const child = firstApp.process();
    child.kill('SIGKILL');
    await new Promise<void>((resolve) => child.once('exit', () => resolve()));
    expect(fs.existsSync(roundTripAutosavePath)).toBe(true);

    const secondApp = await electron.launch({
      args: [`--user-data-dir=${roundTripUserDataDir}`, ELECTRON_DIR],
      env: { ...process.env, CHEMATIC_E2E_AUTOSAVE_ANSWER: 'restore' },
    });
    const secondWindow = await secondApp.firstWindow();
    await expect(secondWindow.getByTestId('app-root')).toHaveAttribute('data-ready', 'true', {
      timeout: 15000,
    });

    await expect(secondWindow.getByText(/^2a • 1b/)).toBeVisible({ timeout: 10000 });
    expect(fs.existsSync(roundTripAutosavePath)).toBe(false);

    await secondApp.close();
  });
});
