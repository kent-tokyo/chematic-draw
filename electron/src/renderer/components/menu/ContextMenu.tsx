import React, { useEffect } from 'react';
import { useUIStore } from '../../store/uiStore';
import { useMoleculeStore } from '../../store/moleculeStore';
import * as wasmBridge from '../../wasm/wasmBridge';

export function ContextMenu() {
  const theme = useUIStore((s) => s.theme);
  const contextMenu = useUIStore((s) => s.contextMenu);
  const hideContextMenu = useUIStore((s) => s.hideContextMenu);
  const selectedAtom = useUIStore((s) => s.selectedAtomForInspector);
  const selectedBond = useUIStore((s) => s.selectedBondForInspector);
  const molecule = useMoleculeStore((s) => s.molecule);
  const removeAtom = useMoleculeStore((s) => s.removeAtom);
  const removeBond = useMoleculeStore((s) => s.removeBond);
  const updateAtom = useMoleculeStore((s) => s.updateAtom);
  const updateBond = useMoleculeStore((s) => s.updateBond);
  const setMolecule = useMoleculeStore((s) => s.setMolecule);
  const pushUndo = useMoleculeStore((s) => s.pushUndo);

  // Close context menu on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        hideContextMenu();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [hideContextMenu]);

  // Close context menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const menu = document.getElementById('context-menu');
      if (menu && !menu.contains(e.target as Node)) {
        hideContextMenu();
      }
    };
    if (contextMenu?.visible) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => document.removeEventListener('click', handleClickOutside);
  }, [contextMenu?.visible, hideContextMenu]);

  if (!contextMenu?.visible) return null;

  const bgColor = theme === 'dark' ? '#2f3a47' : '#ffffff';
  const textColor = theme === 'dark' ? '#d8deea' : '#1d2430';
  const hoverBg = theme === 'dark' ? '#3a4a57' : '#f0f0f0';
  const borderColor = theme === 'dark' ? '#3a4a57' : '#e0e0e0';

  const menuItems: Array<{ label: string; action: () => void }> = [];

  if (selectedAtom) {
    // No "Set Element" here — that needs the full ElementPicker widget
    // (Inspector tab), not a single menu action; a stub button that opened
    // nothing was worse than not offering it.
    menuItems.push(
      {
        label: 'Charge +1',
        action: () => {
          pushUndo();
          updateAtom(selectedAtom.id, { charge: selectedAtom.charge + 1 });
        },
      },
      {
        label: 'Charge -1',
        action: () => {
          pushUndo();
          updateAtom(selectedAtom.id, { charge: selectedAtom.charge - 1 });
        },
      },
      { label: '', action: () => {} }, // separator
      {
        label: 'Delete Atom',
        action: () => {
          pushUndo();
          removeAtom(selectedAtom.id);
          hideContextMenu();
        },
      }
    );
  } else if (selectedBond) {
    menuItems.push(
      { label: 'Single Bond', action: () => { pushUndo(); updateBond(selectedBond.id, { order: 1 }); } },
      { label: 'Double Bond', action: () => { pushUndo(); updateBond(selectedBond.id, { order: 2 }); } },
      { label: 'Triple Bond', action: () => { pushUndo(); updateBond(selectedBond.id, { order: 3 }); } },
      { label: 'Aromatic Bond', action: () => { pushUndo(); updateBond(selectedBond.id, { order: 4 }); } },
      { label: '', action: () => {} }, // separator
      { label: 'Wedge Up', action: () => { pushUndo(); updateBond(selectedBond.id, { stereo: 1 }); } },
      { label: 'Dash Down', action: () => { pushUndo(); updateBond(selectedBond.id, { stereo: 6 }); } },
      { label: '', action: () => {} }, // separator
      {
        label: 'Delete Bond',
        action: () => {
          pushUndo();
          removeBond(selectedBond.id);
          hideContextMenu();
        },
      }
    );
  } else {
    menuItems.push(
      { label: 'Clean Layout', action: () => { pushUndo(); setMolecule(wasmBridge.cleanLayout(molecule)); } },
      { label: 'Standardize', action: () => { pushUndo(); setMolecule(wasmBridge.standardizeMolecule(molecule)); } }
    );
  }

  // Clamp position to avoid going off-screen
  let x = contextMenu.x;
  let y = contextMenu.y;
  const menuWidth = 160;
  const menuHeight = menuItems.length * 32;

  if (x + menuWidth > window.innerWidth) {
    x = window.innerWidth - menuWidth - 10;
  }
  if (y + menuHeight > window.innerHeight) {
    y = window.innerHeight - menuHeight - 10;
  }

  return (
    <div
      id="context-menu"
      style={{
        position: 'fixed',
        left: `${x}px`,
        top: `${y}px`,
        backgroundColor: bgColor,
        border: `1px solid ${borderColor}`,
        borderRadius: '4px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        zIndex: 1000,
        overflow: 'hidden',
      }}
    >
      {menuItems.map((item, idx) => (
        item.label === '' ? (
          <div
            key={idx}
            style={{
              height: '1px',
              backgroundColor: borderColor,
              margin: '4px 0',
            }}
          />
        ) : (
          <button
            key={idx}
            onClick={() => {
              item.action();
              hideContextMenu();
            }}
            style={{
              display: 'block',
              width: '100%',
              padding: '8px 12px',
              border: 'none',
              backgroundColor: 'transparent',
              color: textColor,
              textAlign: 'left',
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = hoverBg)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            {item.label}
          </button>
        )
      ))}
    </div>
  );
}
