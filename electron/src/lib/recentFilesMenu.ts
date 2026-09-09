import path from 'node:path';

interface RecentFilesMenuDependencies {
  recentFiles: unknown;
  isValidFilePath: (value: unknown) => boolean;
  loadSettings: () => Record<string, unknown>;
  saveSettings: (settings: Record<string, unknown>) => void;
  readImportText: (filePath: string) => string;
  sendToRenderer: (channel: string, payload: { path: string; content: string }) => void;
  showError: (title: string, message: string) => void;
  rebuildMenu: (recentFiles: string[]) => void;
}

interface RecentFilesMenuItem {
  label?: string;
  accelerator?: string;
  type?: 'separator';
  click?: () => void | Promise<void>;
}

/** Builds the mutable Recent Files submenu without owning the full app menu. */
export function buildRecentFilesSubmenu({
  recentFiles,
  isValidFilePath,
  loadSettings,
  saveSettings,
  readImportText,
  sendToRenderer,
  showError,
  rebuildMenu,
}: RecentFilesMenuDependencies) {
  const safeRecentFiles = Array.isArray(recentFiles) ? recentFiles.filter(isValidFilePath) as string[] : [];
  const submenu: RecentFilesMenuItem[] = safeRecentFiles.map((filePath, index) => ({
    label: `${index + 1}. ${path.basename(filePath)}`,
    accelerator: `Ctrl+${index + 1}`,
    click: async () => {
      try {
        sendToRenderer('menu:open-file', { path: filePath, content: readImportText(filePath) });
      } catch (error) {
        showError('Error', `Failed to open: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
  }));
  if (submenu.length > 0) submenu.push({ type: 'separator' as const });
  submenu.push({
    label: 'Clear Recent Files',
    click: () => {
      const settings = loadSettings();
      settings.recentFiles = [];
      saveSettings(settings);
      rebuildMenu([]);
    },
  });
  return submenu;
}
