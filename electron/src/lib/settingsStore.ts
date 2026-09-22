import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ALLOWED_SETTINGS_KEYS = new Set(['theme', 'language', 'sidebarWidth', 'mainToolsOpen', 'generalToolbarOpen', 'statusBarOpen', 'templatePanelOpen', 'templatePanelWidth', 'workspaceProfile', 'activeSidebarPanel', 'shortcutBindings']);
const SIDEBAR_PANELS = new Set(['inspector', 'query', 'stereo', 'chat', 'research', 'reactions', 'batch-results', 'stereoisomers', 'lipinski', 'properties', 'mechanism', 'database', '3d', 'nmr']);
const SHORTCUT_SETTING_KEYS = new Set([
  'copy', 'cut', 'paste', 'duplicate', 'cleanLayout', 'export', 'undo', 'redo', 'zoomIn', 'zoomOut',
  'zoomReset', 'focusMode', 'showShortcuts', 'selectAll', 'delete',
]);
const MAX_SETTINGS_VALUE_LENGTH = 100_000;

/** File-backed settings boundary. The file remains user-editable, so every read is validated. */
export function createSettingsStore(userDataPath: string) {
  const settingsPath = path.join(userDataPath, 'settings.json');
  const settingsTempPath = `${settingsPath}.tmp`;

  const isSafeKey = (key: unknown) => typeof key === 'string' && ALLOWED_SETTINGS_KEYS.has(key);
  const isSafeValue = (key: string, value: unknown) => {
    if (key === 'theme') return value === 'dark' || value === 'light';
    if (key === 'language') return value === 'en' || value === 'ja' || value === 'zh';
    if (key === 'sidebarWidth') return typeof value === 'number' && Number.isFinite(value)
      && (value === 0 || (value >= 180 && value <= 480));
    if (key === 'mainToolsOpen' || key === 'generalToolbarOpen' || key === 'statusBarOpen' || key === 'templatePanelOpen') return typeof value === 'boolean';
    if (key === 'templatePanelWidth') return typeof value === 'number' && Number.isFinite(value) && value >= 190 && value <= 480;
    if (key === 'workspaceProfile') return value === 'chemdraw' || value === 'compact';
    if (key === 'activeSidebarPanel') return typeof value === 'string' && SIDEBAR_PANELS.has(value);
    if (key !== 'shortcutBindings' || !value || typeof value !== 'object' || Array.isArray(value)) return false;
    if (Object.keys(value).some((shortcut) => !SHORTCUT_SETTING_KEYS.has(shortcut))) return false;
    try {
      return JSON.stringify(value).length <= MAX_SETTINGS_VALUE_LENGTH
        && Object.values(value).every((shortcut) => typeof shortcut === 'string' && shortcut.length <= 128);
    } catch {
      return false;
    }
  };

  const load = (): Record<string, unknown> => {
    if (!existsSync(settingsPath)) return {};
    try {
      const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
      return settings && typeof settings === 'object' && !Array.isArray(settings) ? settings : {};
    } catch (error) {
      console.error('Failed to load settings:', error);
      return {};
    }
  };

  const save = (data: Record<string, unknown>) => {
    const dir = path.dirname(settingsPath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(settingsTempPath, JSON.stringify(data, null, 2), 'utf-8');
    renameSync(settingsTempPath, settingsPath);
  };

  return { load, save, isSafeKey, isSafeValue };
}
