import { NATIVE_MENU_COMMAND_IDS, validateWorkspaceCommandPlacements, WORKSPACE_COMMANDS } from '../renderer/lib/workspaceCommands';

describe('workspace command placement inventory', () => {
  it('assigns exactly one canonical record and does not repeat its primary surface', () => {
    expect(validateWorkspaceCommandPlacements()).toEqual([]);
    expect(new Set(WORKSPACE_COMMANDS.map((command) => command.id)).size).toBe(WORKSPACE_COMMANDS.length);
  });

  it('keeps drawing tools on the palette and analyses in panels or menus', () => {
    expect(WORKSPACE_COMMANDS.filter((command) => command.id.startsWith('main-tool.')).every((command) => command.primary === 'main-tools')).toBe(true);
    expect(WORKSPACE_COMMANDS.find((command) => command.id === 'search.smarts')?.primary).toBe('query-panel');
    expect(WORKSPACE_COMMANDS.find((command) => command.id === 'template.insert')?.primary).toBe('template-panel');
  });

  it('gives every native menu command one migration destination', () => {
    const ownedIds = new Set(WORKSPACE_COMMANDS.map((command) => command.id));
    expect(NATIVE_MENU_COMMAND_IDS.filter((id) => !ownedIds.has(id))).toEqual([]);
  });

  it('keeps the migration guide in Help with a browser-reachable toolbar entry', () => {
    expect(WORKSPACE_COMMANDS.find((command) => command.id === 'help.migration')).toMatchObject({
      primary: 'help-menu',
      secondary: ['general-toolbar'],
    });
  });
});
