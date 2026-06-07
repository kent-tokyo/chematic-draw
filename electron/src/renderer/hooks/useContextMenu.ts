import { useCallback } from 'react';
import { useMoleculeStore } from '../store/moleculeStore';
import { useCanvasStore } from '../store/canvasStore';
import { useUIStore } from '../store/uiStore';
import { hitTestAtom, hitTestBond } from '../lib/geometry';

export function useContextMenu() {
  const molecule = useMoleculeStore((s) => s.molecule);
  const canvasState = useCanvasStore((s) => ({ offset: s.offset, zoom: s.zoom }));
  const showContextMenu = useUIStore((s) => s.showContextMenu);
  const setSelectedAtomForInspector = useUIStore((s) => s.setSelectedAtomForInspector);
  const setSelectedBondForInspector = useUIStore((s) => s.setSelectedBondForInspector);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      e.preventDefault();

      const rect = (e.currentTarget as HTMLCanvasElement).getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;

      // Try atom first
      const atomId = hitTestAtom(molecule, screenX, screenY, canvasState);
      if (atomId !== null) {
        const atom = molecule.atoms.find((a) => a.id === atomId);
        if (atom) {
          setSelectedAtomForInspector(atom);
          showContextMenu(e.clientX - rect.left, e.clientY - rect.top, atomId);
        }
        return;
      }

      // Try bond
      const bondId = hitTestBond(molecule, screenX, screenY, canvasState);
      if (bondId !== null) {
        const bond = molecule.bonds.find((b) => b.id === bondId);
        if (bond) {
          setSelectedBondForInspector(bond);
          showContextMenu(e.clientX - rect.left, e.clientY - rect.top, undefined, bondId);
        }
        return;
      }

      // Canvas context menu
      showContextMenu(e.clientX - rect.left, e.clientY - rect.top);
    },
    [molecule, canvasState, showContextMenu, setSelectedAtomForInspector, setSelectedBondForInspector]
  );

  return { handleContextMenu };
}
