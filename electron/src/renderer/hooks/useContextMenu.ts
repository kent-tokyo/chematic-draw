import { useCallback, useMemo } from 'react';
import { useMoleculeStore } from '../store/moleculeStore';
import { useCanvasStore } from '../store/canvasStore';
import { useUIStore } from '../store/uiStore';
import { hitTestAtom, hitTestBond } from '../lib/geometry';

export function useContextMenu() {
  const molecule = useMoleculeStore((s) => s.molecule);
  // Select offset/zoom separately (stable primitives), not as a selector that
  // returns `{offset, zoom}` — a Zustand selector returning a fresh object
  // literal on every call breaks useSyncExternalStore's snapshot caching and
  // causes an infinite render loop ("Maximum update depth exceeded"), not
  // just a wasted render.
  const offset = useCanvasStore((s) => s.offset);
  const zoom = useCanvasStore((s) => s.zoom);
  const canvasState = useMemo(() => ({ offset, zoom }), [offset, zoom]);
  const showContextMenu = useUIStore((s) => s.showContextMenu);
  const setSelectedAtomIdForInspector = useUIStore((s) => s.setSelectedAtomIdForInspector);
  const setSelectedBondIdForInspector = useUIStore((s) => s.setSelectedBondIdForInspector);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      e.preventDefault();

      const rect = (e.currentTarget as HTMLCanvasElement).getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;

      // Try atom first
      const atomId = hitTestAtom(molecule, screenX, screenY, canvasState);
      if (atomId !== null) {
        // Mutual exclusion: an atom and a bond selected independently (one
        // right-click each, or a left-click atom then a right-click bond)
        // used to both stay non-null, so InspectorPanel rendered both
        // sections' fields stacked on top of each other.
        setSelectedAtomIdForInspector(atomId);
        setSelectedBondIdForInspector(null);
        showContextMenu(e.clientX - rect.left, e.clientY - rect.top, atomId);
        return;
      }

      // Try bond
      const bondId = hitTestBond(molecule, screenX, screenY, canvasState);
      if (bondId !== null) {
        const bond = molecule.bonds.find((b) => b.id === bondId);
        if (bond) {
          setSelectedBondIdForInspector(bond.id);
          setSelectedAtomIdForInspector(null);
          showContextMenu(e.clientX - rect.left, e.clientY - rect.top, undefined, bondId);
        }
        return;
      }

      // Canvas context menu
      showContextMenu(e.clientX - rect.left, e.clientY - rect.top);
    },
    [molecule, canvasState, showContextMenu, setSelectedAtomIdForInspector, setSelectedBondIdForInspector]
  );

  return { handleContextMenu };
}
