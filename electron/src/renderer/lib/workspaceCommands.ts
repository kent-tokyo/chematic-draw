export type CommandSurface = 'file-menu' | 'edit-menu' | 'view-menu' | 'object-menu' | 'structure-menu' | 'search-menu' | 'window-menu' | 'help-menu' | 'general-toolbar' | 'main-tools' | 'properties-panel' | 'query-panel' | 'stereo-panel' | 'template-panel';

export interface WorkspaceCommandPlacement {
  id: string;
  label: string;
  primary: CommandSurface;
  secondary?: readonly CommandSurface[];
}

/**
 * Canonical command geography for the ChemDraw-familiar workspace.
 * A command appears exactly once here; secondary surfaces are deliberate
 * accelerators for the same action rather than competing navigation homes.
 */
export const WORKSPACE_COMMANDS: readonly WorkspaceCommandPlacement[] = [
  { id: 'document.new', label: 'New', primary: 'file-menu', secondary: ['general-toolbar'] },
  { id: 'document.open', label: 'Open', primary: 'file-menu', secondary: ['general-toolbar'] },
  { id: 'document.save', label: 'Save', primary: 'file-menu', secondary: ['general-toolbar'] },
  { id: 'document.export', label: 'Export', primary: 'file-menu' },
  { id: 'document.print', label: 'Print', primary: 'file-menu' },
  { id: 'edit.undo', label: 'Undo', primary: 'edit-menu', secondary: ['general-toolbar'] },
  { id: 'edit.redo', label: 'Redo', primary: 'edit-menu', secondary: ['general-toolbar'] },
  { id: 'edit.clipboard', label: 'Cut, Copy, Paste', primary: 'edit-menu' },
  { id: 'view.zoom', label: 'Zoom', primary: 'view-menu', secondary: ['general-toolbar'] },
  { id: 'view.fit', label: 'Fit', primary: 'view-menu', secondary: ['general-toolbar'] },
  { id: 'view.workspace', label: 'Workspace layout', primary: 'view-menu' },
  { id: 'tool.select', label: 'Select', primary: 'main-tools' },
  { id: 'tool.bond', label: 'Bond tools', primary: 'main-tools' },
  { id: 'tool.ring', label: 'Ring tools', primary: 'main-tools' },
  { id: 'tool.atom', label: 'Atom tools', primary: 'main-tools' },
  { id: 'tool.arrow', label: 'Reaction arrow', primary: 'main-tools' },
  { id: 'tool.text', label: 'Text', primary: 'main-tools' },
  { id: 'tool.bracket', label: 'Bracket', primary: 'main-tools' },
  { id: 'tool.eraser', label: 'Eraser', primary: 'main-tools' },
  { id: 'object.align', label: 'Align', primary: 'object-menu', secondary: ['general-toolbar'] },
  { id: 'object.distribute', label: 'Distribute', primary: 'object-menu' },
  { id: 'object.flip', label: 'Flip', primary: 'object-menu' },
  { id: 'object.rotate', label: 'Rotate', primary: 'object-menu', secondary: ['general-toolbar'] },
  { id: 'structure.clean', label: 'Clean Up Structure', primary: 'structure-menu', secondary: ['general-toolbar'] },
  { id: 'structure.check', label: 'Check Structure', primary: 'structure-menu', secondary: ['properties-panel'] },
  { id: 'structure.properties', label: 'Properties', primary: 'properties-panel', secondary: ['window-menu'] },
  { id: 'structure.stereo', label: 'Stereo', primary: 'stereo-panel', secondary: ['structure-menu', 'window-menu'] },
  { id: 'search.database', label: 'Database Search', primary: 'search-menu' },
  { id: 'search.smarts', label: 'SMARTS Query', primary: 'query-panel', secondary: ['search-menu', 'window-menu'] },
  { id: 'search.mcs', label: 'Identifiers and MCS', primary: 'search-menu' },
  { id: 'template.insert', label: 'Insert Template', primary: 'template-panel', secondary: ['main-tools', 'window-menu'] },
  { id: 'help.shortcuts', label: 'Keyboard Shortcuts', primary: 'help-menu' },
] as const;

export function validateWorkspaceCommandPlacements(commands: readonly WorkspaceCommandPlacement[] = WORKSPACE_COMMANDS): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const command of commands) {
    if (ids.has(command.id)) errors.push(`Duplicate command id: ${command.id}`);
    ids.add(command.id);
    if (command.secondary?.includes(command.primary)) errors.push(`Primary surface repeated as secondary: ${command.id}`);
  }
  return errors;
}
