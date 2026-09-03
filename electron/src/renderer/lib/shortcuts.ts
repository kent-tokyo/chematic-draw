import type { UIAction } from '../../../../packages/chematic-contract/src/index';

export type ShortcutAction = UIAction;
export type ShortcutBindings = Record<ShortcutAction, string>;

export const DEFAULT_SHORTCUT_BINDINGS: ShortcutBindings = {
  copy: 'primary+c', paste: 'primary+v', cleanLayout: 'primary+l', export: 'primary+e', undo: 'primary+z', redo: 'primary+shift+z',
  zoomIn: 'primary+=', zoomOut: 'primary+-', zoomReset: 'primary+0', focusMode: 'primary+shift+f', showShortcuts: 'primary+shift+?', selectAll: 'primary+a', delete: 'delete',
};

const MODIFIERS = new Set(['primary', 'ctrl', 'control', 'cmd', 'meta', 'shift', 'alt', 'option']);
export function normalizeShortcut(value: string): string {
  const parts = value.trim().toLowerCase().split('+').map((part) => part.trim()).filter(Boolean);
  const key = parts.find((part) => !MODIFIERS.has(part));
  if (!key) return '';
  const modifiers = ['primary', 'ctrl', 'cmd', 'shift', 'alt'].filter((modifier) => parts.includes(modifier) || (modifier === 'primary' && parts.includes('control')) || (modifier === 'cmd' && parts.includes('meta')) || (modifier === 'alt' && parts.includes('option')));
  return [...new Set(modifiers), key === 'esc' ? 'escape' : key].join('+');
}
export function isValidShortcut(value: string): boolean { return normalizeShortcut(value).length > 0 && normalizeShortcut(value).split('+').length <= 3; }
export function validateShortcutBindings(bindings: Partial<Record<ShortcutAction, string>>): string | null {
  const seen = new Map<string, ShortcutAction>();
  for (const [action, value] of Object.entries(bindings)) {
    if (!isValidShortcut(value ?? '')) return `${action}: enter a key such as Ctrl+Shift+S`;
    const normalized = normalizeShortcut(value);
    const previous = seen.get(normalized);
    if (previous) return `Shortcut conflict: ${previous} and ${action} both use ${value}`;
    seen.set(normalized, action as ShortcutAction);
  }
  return null;
}
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const contentEditable = target.getAttribute('contenteditable');
  return target.isContentEditable
    || (contentEditable !== null && contentEditable !== 'false')
    || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}
export function matchesShortcut(event: KeyboardEvent, shortcut: string): boolean {
  const parts = normalizeShortcut(shortcut).split('+'); const key = parts.at(-1); if (!key) return false;
  // Accept both physical modifier conventions for `primary`. This keeps
  // Ctrl-based automation and existing cross-platform workflows working on
  // macOS while displaying Cmd in the UI there.
  const isMac = navigator.platform.toUpperCase().includes('MAC');
  const primary = isMac ? event.metaKey || event.ctrlKey : event.ctrlKey;
  if (parts.includes('primary') ? !primary : event.ctrlKey !== parts.includes('ctrl') || event.metaKey !== parts.includes('cmd')) return false;
  if (event.shiftKey !== parts.includes('shift') || event.altKey !== parts.includes('alt')) return false;
  const eventKey = event.key.toLowerCase() === ' ' ? 'space' : event.key.toLowerCase(); return eventKey === key || (key === 'escape' && eventKey === 'esc');
}
export function displayShortcut(value: string): string {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().includes('MAC');
  return value.split('+').map((part) => part === 'primary' ? (isMac ? 'Cmd' : 'Ctrl') : part === 'shift' ? 'Shift' : part === 'alt' ? (isMac ? 'Option' : 'Alt') : part === 'escape' ? 'Esc' : part.length === 1 ? part.toUpperCase() : part[0].toUpperCase() + part.slice(1)).join('+');
}

export interface Shortcut { action?: ShortcutAction; keys: string; description: string; configurable?: boolean; }
export interface ShortcutGroup { category: string; shortcuts: Shortcut[]; }
export const SHORTCUTS: ShortcutGroup[] = [
  { category: 'Tools', shortcuts: [{ keys: 'Esc', description: 'Select tool' }, { keys: 'C', description: 'Carbon atom (C)' }, { keys: 'N', description: 'Nitrogen atom (N)' }, { keys: 'O', description: 'Oxygen atom (O)' }, { keys: 'S', description: 'Sulfur atom (S)' }, { keys: 'P', description: 'Phosphorus atom (P)' }, { keys: '1 / 2 / 3 / 4', description: 'Bond order tools' }, { keys: 'Del', description: 'Eraser / Delete' }] },
  { category: 'Keyboard Canvas Editing', shortcuts: [{ keys: 'Tab', description: 'Focus the canvas (auto-selects the first atom)' }, { keys: 'Arrow keys', description: 'Move the roving atom focus' }, { keys: 'Shift+C/N/O/S/P', description: 'Add that element, bonded to the focused atom' }, { keys: 'Enter', description: 'Start bonding the focused atom' }] },
  { category: 'File', shortcuts: [{ keys: 'Cmd+N / Ctrl+N', description: 'New molecule' }, { keys: 'Cmd+O / Ctrl+O', description: 'Open file' }, { keys: 'Cmd+S / Ctrl+S', description: 'Save' }, { keys: 'Cmd+Shift+S / Ctrl+Shift+S', description: 'Save As' }, { action: 'export', keys: DEFAULT_SHORTCUT_BINDINGS.export, description: 'Export', configurable: true }] },
  { category: 'Editing', shortcuts: [{ action: 'undo', keys: DEFAULT_SHORTCUT_BINDINGS.undo, description: 'Undo', configurable: true }, { action: 'redo', keys: DEFAULT_SHORTCUT_BINDINGS.redo, description: 'Redo', configurable: true }, { action: 'copy', keys: DEFAULT_SHORTCUT_BINDINGS.copy, description: 'Copy SMILES', configurable: true }, { action: 'paste', keys: DEFAULT_SHORTCUT_BINDINGS.paste, description: 'Paste structure', configurable: true }, { action: 'cleanLayout', keys: DEFAULT_SHORTCUT_BINDINGS.cleanLayout, description: 'Clean layout', configurable: true }, { action: 'selectAll', keys: DEFAULT_SHORTCUT_BINDINGS.selectAll, description: 'Select all', configurable: true }, { action: 'delete', keys: DEFAULT_SHORTCUT_BINDINGS.delete, description: 'Delete selected atoms/bonds', configurable: true }] },
  { category: 'View', shortcuts: [{ action: 'zoomIn', keys: DEFAULT_SHORTCUT_BINDINGS.zoomIn, description: 'Zoom in', configurable: true }, { action: 'zoomOut', keys: DEFAULT_SHORTCUT_BINDINGS.zoomOut, description: 'Zoom out', configurable: true }, { action: 'zoomReset', keys: DEFAULT_SHORTCUT_BINDINGS.zoomReset, description: 'Reset zoom', configurable: true }, { action: 'focusMode', keys: DEFAULT_SHORTCUT_BINDINGS.focusMode, description: 'Toggle focus mode', configurable: true }] },
  { category: 'Help', shortcuts: [{ action: 'showShortcuts', keys: DEFAULT_SHORTCUT_BINDINGS.showShortcuts, description: 'Show keyboard shortcuts', configurable: true }, { keys: 'F1', description: 'Show keyboard shortcuts' }] },
];
