export type CommandSurface = 'file-menu' | 'edit-menu' | 'view-menu' | 'object-menu' | 'structure-menu' | 'search-menu' | 'window-menu' | 'help-menu' | 'general-toolbar' | 'main-tools' | 'properties-panel' | 'query-panel' | 'stereo-panel' | 'template-panel';

export interface WorkspaceCommandPlacement {
  id: string;
  label: string;
  primary: CommandSurface;
  secondary?: readonly CommandSurface[];
}

/**
 * Commands exposed by the native application menu.  Keep this list at the
 * same granularity as the menu labels: a grouped "Export" submenu is not a
 * useful migration destination when the user needs a specific file format.
 * The renderer test uses this as a completeness contract for the menu map.
 */
export const NATIVE_MENU_COMMAND_IDS = [
  'document.new', 'document.open', 'document.save', 'document.save-as',
  'document.export-svg', 'document.export-png', 'document.export-pdf',
  'document.export-mol', 'document.export-smiles', 'document.export-session',
  'document.print', 'document.batch-process', 'document.recent-files',
  'edit.undo', 'edit.redo', 'edit.undo-timeline', 'edit.cut', 'edit.copy',
  'edit.paste', 'edit.select-all',
  'view.zoom-in', 'view.zoom-out', 'view.zoom-reset', 'view.fit',
  'view.sidebar', 'view.main-tools', 'view.general-toolbar', 'view.status-bar',
  'view.theme', 'view.workspace-profile', 'view.reset-workspace',
  'object.align-horizontal', 'object.align-vertical',
  'object.distribute-horizontal', 'object.distribute-vertical',
  'object.flip-horizontal', 'object.flip-vertical', 'object.rotate',
  'structure.clean', 'structure.check', 'structure.selection-properties',
  'structure.bond-stereo', 'structure.stereoisomers', 'structure.lipinski',
  'structure.property-prediction', 'structure.reaction-mechanism',
  'search.database', 'search.smarts', 'search.identifiers-mcs',
  'window.inspector', 'window.query', 'window.stereo', 'window.templates',
  'window.reactions', 'window.mechanism', 'window.3d', 'window.nmr',
  'window.batch-results', 'help.shortcuts', 'help.migration', 'help.about',
] as const;

/**
 * Canonical command geography for the ChemDraw-familiar workspace.
 * A command appears exactly once here; secondary surfaces are deliberate
 * accelerators for the same action rather than competing navigation homes.
 */
export const WORKSPACE_COMMANDS: readonly WorkspaceCommandPlacement[] = [
  { id: 'document.new', label: 'New', primary: 'file-menu', secondary: ['general-toolbar'] },
  { id: 'document.open', label: 'Open', primary: 'file-menu', secondary: ['general-toolbar'] },
  { id: 'document.save', label: 'Save', primary: 'file-menu', secondary: ['general-toolbar'] },
  { id: 'document.save-as', label: 'Save As', primary: 'file-menu' },
  { id: 'document.export-svg', label: 'Export SVG', primary: 'file-menu' },
  { id: 'document.export-png', label: 'Export PNG', primary: 'file-menu' },
  { id: 'document.export-pdf', label: 'Export PDF', primary: 'file-menu' },
  { id: 'document.export-mol', label: 'Export MOL V2000', primary: 'file-menu' },
  { id: 'document.export-smiles', label: 'Export SMILES', primary: 'file-menu' },
  { id: 'document.export-session', label: 'Export session bundle', primary: 'file-menu' },
  { id: 'document.print', label: 'Print', primary: 'file-menu' },
  { id: 'document.batch-process', label: 'Batch Process', primary: 'file-menu' },
  { id: 'document.recent-files', label: 'Recent Files', primary: 'file-menu' },
  { id: 'edit.undo', label: 'Undo', primary: 'edit-menu', secondary: ['general-toolbar'] },
  { id: 'edit.redo', label: 'Redo', primary: 'edit-menu', secondary: ['general-toolbar'] },
  { id: 'edit.undo-timeline', label: 'Undo Timeline', primary: 'edit-menu' },
  { id: 'edit.cut', label: 'Cut', primary: 'edit-menu' },
  { id: 'edit.copy', label: 'Copy', primary: 'edit-menu' },
  { id: 'edit.paste', label: 'Paste', primary: 'edit-menu' },
  { id: 'edit.select-all', label: 'Select All', primary: 'edit-menu' },
  { id: 'view.zoom-in', label: 'Zoom In', primary: 'view-menu', secondary: ['general-toolbar'] },
  { id: 'view.zoom-out', label: 'Zoom Out', primary: 'view-menu', secondary: ['general-toolbar'] },
  { id: 'view.zoom-reset', label: 'Reset Zoom', primary: 'view-menu', secondary: ['general-toolbar'] },
  { id: 'view.fit', label: 'Fit', primary: 'view-menu', secondary: ['general-toolbar'] },
  { id: 'view.sidebar', label: 'Toggle Sidebar', primary: 'view-menu' },
  { id: 'view.main-tools', label: 'Show or hide Main Tools', primary: 'view-menu' },
  { id: 'view.general-toolbar', label: 'Show or hide General Toolbar', primary: 'view-menu' },
  { id: 'view.status-bar', label: 'Show or hide Status Bar', primary: 'view-menu' },
  { id: 'view.theme', label: 'Toggle Theme', primary: 'view-menu' },
  { id: 'view.workspace-profile', label: 'Workspace profile', primary: 'view-menu' },
  { id: 'view.reset-workspace', label: 'Reset Workspace', primary: 'view-menu' },
  { id: 'main-tool.select', label: 'Select', primary: 'main-tools' },
  { id: 'main-tool.bond', label: 'Bond tools', primary: 'main-tools' },
  { id: 'main-tool.ring', label: 'Ring tools', primary: 'main-tools' },
  { id: 'main-tool.atom', label: 'Atom tools', primary: 'main-tools' },
  { id: 'main-tool.arrow', label: 'Reaction arrow', primary: 'main-tools' },
  { id: 'main-tool.text', label: 'Text', primary: 'main-tools' },
  { id: 'main-tool.bracket', label: 'Bracket', primary: 'main-tools' },
  { id: 'main-tool.eraser', label: 'Eraser', primary: 'main-tools' },
  { id: 'object.align-horizontal', label: 'Align Horizontally', primary: 'object-menu', secondary: ['general-toolbar'] },
  { id: 'object.align-vertical', label: 'Align Vertically', primary: 'object-menu', secondary: ['general-toolbar'] },
  { id: 'object.distribute-horizontal', label: 'Distribute Horizontally', primary: 'object-menu' },
  { id: 'object.distribute-vertical', label: 'Distribute Vertically', primary: 'object-menu' },
  { id: 'object.flip-horizontal', label: 'Flip Horizontally', primary: 'object-menu' },
  { id: 'object.flip-vertical', label: 'Flip Vertically', primary: 'object-menu' },
  { id: 'object.rotate', label: 'Rotate', primary: 'object-menu', secondary: ['general-toolbar'] },
  { id: 'structure.clean', label: 'Clean Up Structure', primary: 'structure-menu', secondary: ['general-toolbar'] },
  { id: 'structure.check', label: 'Check Structure', primary: 'structure-menu', secondary: ['properties-panel'] },
  { id: 'structure.selection-properties', label: 'Selection Properties', primary: 'properties-panel', secondary: ['structure-menu', 'window-menu'] },
  { id: 'structure.bond-stereo', label: 'Bond Stereo', primary: 'stereo-panel', secondary: ['structure-menu', 'window-menu'] },
  { id: 'structure.stereoisomers', label: 'Stereoisomers', primary: 'structure-menu' },
  { id: 'structure.lipinski', label: 'Lipinski Rules', primary: 'structure-menu' },
  { id: 'structure.property-prediction', label: 'Property Prediction', primary: 'structure-menu' },
  { id: 'structure.reaction-mechanism', label: 'Reaction Mechanism', primary: 'structure-menu' },
  { id: 'search.database', label: 'Database Search', primary: 'search-menu' },
  { id: 'search.smarts', label: 'SMARTS Query', primary: 'query-panel', secondary: ['search-menu', 'window-menu'] },
  { id: 'search.identifiers-mcs', label: 'Identifiers and MCS', primary: 'search-menu' },
  { id: 'template.insert', label: 'Insert Template', primary: 'template-panel', secondary: ['main-tools', 'window-menu'] },
  { id: 'window.inspector', label: 'Inspector', primary: 'window-menu', secondary: ['properties-panel'] },
  { id: 'window.query', label: 'Query', primary: 'window-menu', secondary: ['query-panel'] },
  { id: 'window.stereo', label: 'Stereo', primary: 'window-menu', secondary: ['stereo-panel'] },
  { id: 'window.templates', label: 'Templates', primary: 'window-menu', secondary: ['template-panel'] },
  { id: 'window.reactions', label: 'Reactions', primary: 'window-menu' },
  { id: 'window.mechanism', label: 'Mechanism', primary: 'window-menu' },
  { id: 'window.3d', label: '3D Viewer', primary: 'window-menu' },
  { id: 'window.nmr', label: 'NMR Spectrum', primary: 'window-menu' },
  { id: 'window.batch-results', label: 'Batch Results', primary: 'window-menu' },
  { id: 'help.shortcuts', label: 'Keyboard Shortcuts', primary: 'help-menu' },
  { id: 'help.migration', label: 'ChemDraw Migration Guide', primary: 'help-menu', secondary: ['general-toolbar'] },
  { id: 'help.about', label: 'About Chematic Draw', primary: 'help-menu' },
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
