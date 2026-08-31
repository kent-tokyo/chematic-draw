import { DEFAULT_SHORTCUT_BINDINGS, displayShortcut, isEditableTarget, matchesShortcut, normalizeShortcut, validateShortcutBindings } from '../renderer/lib/shortcuts';

describe('shortcut configuration', () => {
  test('recognizes every native editable target', () => {
    const input = document.createElement('input');
    const textarea = document.createElement('textarea');
    const select = document.createElement('select');
    const editable = document.createElement('div');
    editable.setAttribute('contenteditable', 'true');

    expect(isEditableTarget(input)).toBe(true);
    expect(isEditableTarget(textarea)).toBe(true);
    expect(isEditableTarget(select)).toBe(true);
    expect(isEditableTarget(editable)).toBe(true);
    expect(isEditableTarget(document.createElement('canvas'))).toBe(false);
    expect(isEditableTarget(null)).toBe(false);
  });

  test('normalizes portable primary shortcuts', () => {
    expect(normalizeShortcut('Ctrl + Shift + S')).toBe('ctrl+shift+s');
    expect(normalizeShortcut('Cmd+S')).toBe('cmd+s');
    expect(displayShortcut('primary+shift+s')).toMatch(/^(Ctrl|Cmd)\+Shift\+S$/);
  });

  test('rejects malformed and conflicting bindings', () => {
    expect(validateShortcutBindings({ undo: 'primary+z', redo: 'primary+z' })).toMatch(/conflict/i);
    expect(validateShortcutBindings({ undo: 'primary' })).toMatch(/enter a key/i);
    expect(validateShortcutBindings(DEFAULT_SHORTCUT_BINDINGS)).toBeNull();
  });

  test('matches the platform primary modifier', () => {
    Object.defineProperty(navigator, 'platform', { configurable: true, value: 'Linux' });
    expect(matchesShortcut(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true }), 'primary+z')).toBe(true);
    expect(matchesShortcut(new KeyboardEvent('keydown', { key: 'z', metaKey: true }), 'primary+z')).toBe(false);
  });
});
