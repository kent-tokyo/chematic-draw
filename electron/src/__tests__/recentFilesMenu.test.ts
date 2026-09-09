/** @jest-environment node */
import { buildRecentFilesSubmenu } from '../lib/recentFilesMenu';

describe('recent files menu', () => {
  it('filters unsafe entries and opens a selected file through the renderer callback', async () => {
    const sendToRenderer = jest.fn();
    const showError = jest.fn();
    const submenu = buildRecentFilesSubmenu({
      recentFiles: ['/tmp/example.mol', '', 42],
      isValidFilePath: (value) => typeof value === 'string' && value.length > 0,
      loadSettings: () => ({}),
      saveSettings: jest.fn(),
      readImportText: () => 'C',
      sendToRenderer,
      showError,
      rebuildMenu: jest.fn(),
    });
    expect(submenu[0]).toMatchObject({ label: '1. example.mol' });
    await (submenu[0] as { click: () => Promise<void> }).click();
    expect(sendToRenderer).toHaveBeenCalledWith('menu:open-file', { path: '/tmp/example.mol', content: 'C' });
    expect(showError).not.toHaveBeenCalled();
  });

  it('clears persisted recent files and rebuilds the menu', () => {
    const saveSettings = jest.fn();
    const rebuildMenu = jest.fn();
    const submenu = buildRecentFilesSubmenu({
      recentFiles: [],
      isValidFilePath: () => true,
      loadSettings: () => ({ recentFiles: ['/tmp/example.mol'] }),
      saveSettings,
      readImportText: () => '',
      sendToRenderer: jest.fn(),
      showError: jest.fn(),
      rebuildMenu,
    });
    (submenu[0] as { click: () => void }).click();
    expect(saveSettings).toHaveBeenCalledWith({ recentFiles: [] });
    expect(rebuildMenu).toHaveBeenCalledWith([]);
  });
});
