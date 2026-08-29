export interface Shortcut {
  keys: string;
  description: string;
}

export interface ShortcutGroup {
  category: string;
  shortcuts: Shortcut[];
}

export const SHORTCUTS: ShortcutGroup[] = [
  {
    category: 'Tools',
    shortcuts: [
      { keys: 'Esc', description: 'Select tool' },
      { keys: 'C', description: 'Carbon atom (C)' },
      { keys: 'N', description: 'Nitrogen atom (N)' },
      { keys: 'O', description: 'Oxygen atom (O)' },
      { keys: 'S', description: 'Sulfur atom (S)' },
      { keys: 'P', description: 'Phosphorus atom (P)' },
      { keys: '1', description: 'Single bond' },
      { keys: '2', description: 'Double bond' },
      { keys: '3', description: 'Triple bond' },
      { keys: '4', description: 'Aromatic bond' },
      { keys: 'Del', description: 'Eraser / Delete' },
    ],
  },
  {
    category: 'Keyboard Canvas Editing',
    shortcuts: [
      { keys: 'Tab', description: 'Focus the canvas (auto-selects the first atom)' },
      { keys: 'Arrow keys', description: 'Move the roving atom focus' },
      { keys: 'Shift+C/N/O/S/P', description: 'Add that element, bonded to the focused atom' },
      { keys: 'Enter', description: 'Start bonding the focused atom to a second, existing atom' },
      { keys: '1 / 2 / 3 / 4', description: '(in bond mode) Confirm bond order to the arrow-selected target' },
      { keys: 'Esc', description: '(in bond mode) Cancel bond creation' },
    ],
  },
  {
    category: 'File',
    shortcuts: [
      { keys: 'Cmd+N / Ctrl+N', description: 'New molecule' },
      { keys: 'Cmd+O / Ctrl+O', description: 'Open file' },
      { keys: 'Cmd+S / Ctrl+S', description: 'Save' },
      { keys: 'Cmd+Shift+S / Ctrl+Shift+S', description: 'Save As' },
      { keys: 'Cmd+E / Ctrl+E', description: 'Export' },
    ],
  },
  {
    category: 'Editing',
    shortcuts: [
      { keys: 'Cmd+Z / Ctrl+Z', description: 'Undo' },
      { keys: 'Cmd+Shift+Z / Ctrl+Shift+Z', description: 'Redo' },
      { keys: 'Cmd+C / Ctrl+C', description: 'Copy SMILES' },
      { keys: 'Cmd+V / Ctrl+V', description: 'Paste structure' },
      { keys: 'Cmd+L / Ctrl+L', description: 'Clean layout' },
      { keys: 'Delete / Backspace', description: 'Delete selected atoms/bonds' },
    ],
  },
  {
    category: 'View',
    shortcuts: [
      { keys: 'Cmd+= / Ctrl+=', description: 'Zoom in' },
      { keys: 'Cmd+- / Ctrl+-', description: 'Zoom out' },
      { keys: 'Cmd+0 / Ctrl+0', description: 'Reset zoom' },
      { keys: 'Cmd+B / Ctrl+B', description: 'Toggle sidebar' },
      { keys: 'Cmd+Shift+L / Ctrl+Shift+L', description: 'Toggle theme (dark/light)' },
    ],
  },
  {
    category: 'Help',
    shortcuts: [
      { keys: 'Cmd+? / Ctrl+?', description: 'Show keyboard shortcuts' },
      { keys: 'F1', description: 'Show keyboard shortcuts' },
    ],
  },
];
