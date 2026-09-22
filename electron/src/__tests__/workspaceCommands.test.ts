import { validateWorkspaceCommandPlacements, WORKSPACE_COMMANDS } from '../renderer/lib/workspaceCommands';

describe('workspace command placement inventory', () => {
  it('assigns exactly one canonical record and does not repeat its primary surface', () => {
    expect(validateWorkspaceCommandPlacements()).toEqual([]);
    expect(new Set(WORKSPACE_COMMANDS.map((command) => command.id)).size).toBe(WORKSPACE_COMMANDS.length);
  });

  it('keeps drawing tools on the palette and analyses in panels or menus', () => {
    expect(WORKSPACE_COMMANDS.filter((command) => command.id.startsWith('tool.')).every((command) => command.primary === 'main-tools')).toBe(true);
    expect(WORKSPACE_COMMANDS.find((command) => command.id === 'search.smarts')?.primary).toBe('query-panel');
    expect(WORKSPACE_COMMANDS.find((command) => command.id === 'template.insert')?.primary).toBe('template-panel');
  });
});
