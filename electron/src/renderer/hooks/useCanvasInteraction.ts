import { useCallback, useRef, useMemo, useState } from 'react';
import { useMoleculeStore } from '../store/moleculeStore';
import { useCanvasStore } from '../store/canvasStore';
import { useUIStore } from '../store/uiStore';
import { useMechanismStore } from '../store/mechanismStore';
import { Tool, MechanismArrow, MoleculeDto } from '../store/types';
import { hitTestAtom, hitTestBond, calculateBondedAtomPosition, getConnectedComponent } from '../lib/geometry';
import { calculateArrowPath, distanceToCurve } from '../lib/arrowGeometry';
import { getStepBoxAtPosition } from '../lib/schemeLayout';
import { useReactionSchemeStore } from '../store/reactionSchemeStore';

const DRAG_THRESHOLD = 4;
const BOND_LENGTH = 60;

const ELEMENT_NAMES: Record<string, string> = {
  C: 'Carbon',
  N: 'Nitrogen',
  O: 'Oxygen',
  S: 'Sulfur',
  P: 'Phosphorus',
};

export interface CanvasInteractionHandlers {
  onMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseUp: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLCanvasElement>) => void;
  onFocus: () => void;
}

export function useCanvasInteraction(): CanvasInteractionHandlers {
  const dragStateRef = useRef<{
    type: 'none' | 'atom-drag' | 'bond-drag' | 'pan';
    startX: number;
    startY: number;
    atomId?: number;
    bondFrom?: number;
    pushedUndo?: boolean;
  }>({ type: 'none', startX: 0, startY: 0 });

  const molecule = useMoleculeStore((s) => s.molecule);
  const activeTool = useCanvasStore((s) => s.activeTool);
  const setHoverAtom = useCanvasStore((s) => s.setHoverAtom);
  const setHoverBond = useCanvasStore((s) => s.setHoverBond);
  const setBondDrag = useCanvasStore((s) => s.setBondDrag);
  const pan = useCanvasStore((s) => s.pan);
  const activeSidebarPanel = useUIStore((s) => s.activeSidebarPanel);
  const setStatus = useUIStore((s) => s.setStatus);
  const mechanismArrows = useMechanismStore((s) => s.arrows);
  const arrowSelectionMode = useMechanismStore((s) => s.arrowSelectionMode);
  const pendingSourceAtomId = useMechanismStore((s) => s.pendingSourceAtomId);
  const scheme = useReactionSchemeStore((s) => s.scheme);
  const schemeLayout = useReactionSchemeStore((s) => s.schemeLayout);
  const setSelectedStepIndex = useReactionSchemeStore((s) => s.setSelectedStepIndex);
  const goToStep = useReactionSchemeStore((s) => s.goToStep);
  const setViewMode = useReactionSchemeStore((s) => s.setViewMode);
  const setHoveredStepIndex = useReactionSchemeStore((s) => s.setHoveredStepIndex);

  const addAtom = useMoleculeStore((s) => s.addAtom);
  const updateAtom = useMoleculeStore((s) => s.updateAtom);
  const addBond = useMoleculeStore((s) => s.addBond);
  const removeBond = useMoleculeStore((s) => s.removeBond);
  const removeAtom = useMoleculeStore((s) => s.removeAtom);
  const selectAtom = useMoleculeStore((s) => s.selectAtom);
  const selectBond = useMoleculeStore((s) => s.selectBond);
  const deselectAll = useMoleculeStore((s) => s.deselectAll);
  const pushUndo = useMoleculeStore((s) => s.pushUndo);
  const setSelectedAtomIdForInspector = useUIStore((s) => s.setSelectedAtomIdForInspector);
  const setSelectedBondForInspector = useUIStore((s) => s.setSelectedBondForInspector);

  const onMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const { offset, zoom, screenToWorld } = useCanvasStore.getState();
      const canvasState = { offset, zoom };
      const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;

      dragStateRef.current = {
        type: 'none',
        startX: screenX,
        startY: screenY,
      };

      // Handle scheme view clicks - click on step to select and switch to edit
      if (scheme?.viewMode === 'scheme' && schemeLayout) {
        const clickedStepIndex = getStepBoxAtPosition(screenX, screenY, schemeLayout);
        if (clickedStepIndex !== null) {
          setSelectedStepIndex(clickedStepIndex);
          goToStep(clickedStepIndex);
          setViewMode('step');
          setStatus(`✓ Switched to Step ${clickedStepIndex + 1} - Edit mode`);
          return; // Don't process other clicks in scheme mode
        }
      }

      // Handle mechanism arrow selection mode
      if (activeSidebarPanel === 'mechanism' && arrowSelectionMode !== 'idle') {
        const atomId = hitTestAtom(molecule, screenX, screenY, canvasState);
        if (atomId !== null) {
          if (arrowSelectionMode === 'awaitingSink' && pendingSourceAtomId === null) {
            // This is the source atom click
            useMechanismStore.getState().setPendingSourceAtomId(atomId);
            setStatus('Now click sink atom (electron sink)');
            return;
          } else if (arrowSelectionMode === 'awaitingSink' && pendingSourceAtomId !== null) {
            // This is the sink atom click
            if (atomId === pendingSourceAtomId) {
              setStatus('Source and sink atoms must be different');
              useMechanismStore.getState().cancelArrowSelection();
              return;
            }
            // Set the sink atom ID - MechanismPanel will watch for this and show the dialog
            useMechanismStore.getState().setPendingSinkAtomId(atomId);
            return;
          }
        } else {
          if (pendingSourceAtomId === null) {
            setStatus('Click on an atom to select source');
          } else {
            setStatus('Click on an atom to select sink');
          }
          return;
        }
      }

      // If not in arrow selection mode, check if clicking on an arrow to select it
      if (activeSidebarPanel === 'mechanism' && arrowSelectionMode === 'idle') {
        const clickedArrowId = findClickedArrow(
          screenX, screenY,
          mechanismArrows,
          molecule,
          { offset: useCanvasStore.getState().offset, zoom: useCanvasStore.getState().zoom }
        );

        if (clickedArrowId) {
          useMechanismStore.getState().setSelectedArrow(clickedArrowId);
          setStatus('✓ Arrow selected - edit label in panel');
          return;
        }
      }

      // Handle tool-specific logic
      if (activeTool === Tool.Select) {
        const atomId = hitTestAtom(molecule, screenX, screenY, canvasState);
        if (atomId !== null) {
          dragStateRef.current = { type: 'atom-drag', startX: screenX, startY: screenY, atomId };
          selectAtom(atomId, e.shiftKey || e.ctrlKey);
          // Tracks "most recently clicked," not "currently selected" — a
          // Shift/Ctrl-click that toggles this atom back off still leaves
          // the Inspector showing it, same as right-click's "last thing you
          // pointed at" behavior. Clearing the bond keeps the two mutually
          // exclusive — otherwise a stale bond right-clicked earlier would
          // render alongside this atom's fields.
          setSelectedAtomIdForInspector(atomId);
          setSelectedBondForInspector(null);
        } else {
          deselectAll();
        }
      } else if (activeTool === Tool.Eraser) {
        const atomId = hitTestAtom(molecule, screenX, screenY, canvasState);
        const bondId = hitTestBond(molecule, screenX, screenY, canvasState);
        if (atomId !== null) {
          pushUndo();
          removeAtom(atomId);
        } else if (bondId !== null) {
          pushUndo();
          removeBond(bondId);
        }
      } else if (
        activeTool === Tool.Bond_Single ||
        activeTool === Tool.Bond_Double ||
        activeTool === Tool.Bond_Triple ||
        activeTool === Tool.Bond_Aromatic
      ) {
        const atomId = hitTestAtom(molecule, screenX, screenY, canvasState);
        if (atomId !== null) {
          dragStateRef.current = { type: 'bond-drag', startX: screenX, startY: screenY, bondFrom: atomId };
          pushUndo();
        }
      } else if (activeTool.startsWith('atom_')) {
        const element = activeTool === Tool.Atom_C ? 'C' : activeTool.split('_')[1].toUpperCase();
        const atomId = hitTestAtom(molecule, screenX, screenY, canvasState);
        if (atomId !== null) {
          // Change existing atom
          updateAtom(atomId, { element });
        } else {
          // Add new atom
          const worldPos = screenToWorld(screenX, screenY);
          pushUndo();
          addAtom(element, worldPos.x, worldPos.y);
        }
      }
    },
    [molecule, activeTool, activeSidebarPanel, arrowSelectionMode, pendingSourceAtomId, mechanismArrows, selectAtom, deselectAll, removeAtom, removeBond, updateAtom, addAtom, pushUndo, setStatus, scheme, schemeLayout, setSelectedStepIndex, goToStep, setViewMode, setSelectedAtomIdForInspector, setSelectedBondForInspector]
  );

  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const { offset, zoom, screenToWorld } = useCanvasStore.getState();
      const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const canvasState = { offset, zoom };

      // Show hover feedback for scheme steps
      if (scheme?.viewMode === 'scheme' && schemeLayout) {
        const hoveredStepIndex = getStepBoxAtPosition(screenX, screenY, schemeLayout);
        setHoveredStepIndex(hoveredStepIndex);
      }

      // Check if hovering over arrow
      if (activeSidebarPanel === 'mechanism' && mechanismArrows.length > 0) {
        let foundArrowId: string | null = null;
        for (const arrow of mechanismArrows) {
          const path = calculateArrowPath(molecule, arrow, { offset: canvasState.offset, zoom: canvasState.zoom });
          if (path && distanceToCurve(screenX, screenY, path) < 8) {
            foundArrowId = arrow.id;
            break;
          }
        }
        useMechanismStore.getState().setHoverArrow(foundArrowId);
      }

      // Update hover state
      setHoverAtom(hitTestAtom(molecule, screenX, screenY, canvasState));
      setHoverBond(hitTestBond(molecule, screenX, screenY, canvasState));

      // Handle dragging
      const dx = screenX - dragStateRef.current.startX;
      const dy = screenY - dragStateRef.current.startY;
      const dist = Math.hypot(dx, dy);

      if (dragStateRef.current.type === 'none' && dist > DRAG_THRESHOLD) {
        if (e.buttons & 2 || (e.buttons & 1 && activeTool === Tool.Select)) {
          dragStateRef.current.type = 'pan';
        }
      }

      if (dragStateRef.current.type === 'pan') {
        pan(dx, dy);
        dragStateRef.current.startX = screenX;
        dragStateRef.current.startY = screenY;
      } else if (dragStateRef.current.type === 'atom-drag' && dragStateRef.current.atomId) {
        // atom-drag is set eagerly at mousedown (see below), so a plain
        // click-select with no real movement must not move the atom or
        // push an undo checkpoint at all — gate on the same DRAG_THRESHOLD
        // 'pan' uses just above. Once a real drag is confirmed, keep
        // following the cursor every tick (don't re-check dist, which
        // would stall the drag if the cursor jitters back near the start).
        // The undo push itself fires exactly once, on the tick that first
        // crosses the threshold, immediately before that tick's own
        // updateAtom — so it captures the true pre-drag position, not one
        // already nudged by an earlier sub-threshold tick.
        if (dragStateRef.current.pushedUndo || dist > DRAG_THRESHOLD) {
          if (!dragStateRef.current.pushedUndo) {
            pushUndo();
            dragStateRef.current.pushedUndo = true;
          }
          const worldPos = screenToWorld(screenX, screenY);
          updateAtom(dragStateRef.current.atomId, { x: worldPos.x, y: worldPos.y });
        }
      } else if (dragStateRef.current.type === 'bond-drag') {
        setBondDrag(dragStateRef.current.bondFrom, { x: screenX, y: screenY });
      }
    },
    [molecule, activeTool, setHoverAtom, setHoverBond, pan, updateAtom, pushUndo, setBondDrag, activeSidebarPanel, mechanismArrows, scheme, schemeLayout, setHoveredStepIndex]
  );

  const onMouseUp = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const { offset, zoom } = useCanvasStore.getState();
      const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const canvasState = { offset, zoom };

      if (dragStateRef.current.type === 'bond-drag' && dragStateRef.current.bondFrom) {
        const targetAtomId = hitTestAtom(molecule, screenX, screenY, canvasState);
        if (targetAtomId !== null && targetAtomId !== dragStateRef.current.bondFrom) {
          // Add bond
          const order =
            activeTool === Tool.Bond_Single ? 1 : activeTool === Tool.Bond_Double ? 2 : activeTool === Tool.Bond_Triple ? 3 : 4;
          addBond(dragStateRef.current.bondFrom, targetAtomId, order, 0);
        }
        setBondDrag(null);
      }

      dragStateRef.current = { type: 'none', startX: 0, startY: 0 };
    },
    [molecule, activeTool, addBond, setBondDrag]
  );

  // Keyboard-driven editing (accessibility Phase B2): a mouse click has no
  // keyboard equivalent, so this is a roving-focus model instead — arrow
  // keys move which atom is "selected" (reusing the existing shared
  // `selected` field, so mouse and keyboard users see the same highlight),
  // Shift+element adds a new atom bonded to it, and Enter starts a
  // two-step flow to bond it to a second, existing atom. Scoped to the
  // canvas element's own onKeyDown (not a global window listener like
  // useKeyboard.ts's shortcuts) so it only fires while the canvas itself
  // has DOM focus — Tab still moves focus in/out of the canvas normally,
  // it is deliberately NOT repurposed for atom navigation.
  const [bondFromAtomId, setBondFromAtomId] = useState<number | null>(null);
  const [candidateAtomId, setCandidateAtomId] = useState<number | null>(null);

  const sortedAtomIds = useMemo(() => molecule.atoms.map((a) => a.id).sort((a, b) => a - b), [molecule]);

  const describeAtom = useCallback(
    (id: number): string => {
      const atom = molecule.atoms.find((a) => a.id === id);
      if (!atom) return '';
      const name = ELEMENT_NAMES[atom.element] ?? atom.element;
      const bondCount = molecule.bonds.filter((b) => b.from === id || b.to === id).length;
      return `${name}, bonded to ${bondCount} atom${bondCount === 1 ? '' : 's'}`;
    },
    [molecule]
  );

  const onFocus = useCallback(() => {
    const alreadySelected = molecule.atoms.some((a) => a.selected);
    if (alreadySelected) return;
    if (sortedAtomIds.length > 0) {
      selectAtom(sortedAtomIds[0], false);
      setSelectedAtomIdForInspector(sortedAtomIds[0]);
      setSelectedBondForInspector(null);
      setStatus(`Canvas focused. ${describeAtom(sortedAtomIds[0])}.`);
    } else {
      setStatus('Canvas focused, empty. Press Shift+C, Shift+N, Shift+O, Shift+S, or Shift+P to add an atom.');
    }
  }, [molecule, sortedAtomIds, selectAtom, setSelectedAtomIdForInspector, setSelectedBondForInspector, setStatus, describeAtom]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLCanvasElement>) => {
      const selectedId = molecule.atoms.find((a) => a.selected)?.id ?? null;
      const isArrow = e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowUp';
      const forward = e.key === 'ArrowRight' || e.key === 'ArrowDown';

      // Bond mode: kept out of the shared `selected` field (only the
      // candidate atom would end up highlighted, losing track of the
      // anchor atom) — status announcements carry both instead.
      if (bondFromAtomId !== null) {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation(); // don't also trigger the global Escape (deselectAll)
          setBondFromAtomId(null);
          setCandidateAtomId(null);
          setStatus('Bond creation cancelled.');
          return;
        }
        if (isArrow) {
          e.preventDefault();
          e.stopPropagation();
          const others = sortedAtomIds.filter((id) => id !== bondFromAtomId);
          if (others.length === 0) return;
          const curIdx = candidateAtomId !== null ? others.indexOf(candidateAtomId) : -1;
          const nextIdx = curIdx === -1 ? 0 : (curIdx + (forward ? 1 : -1) + others.length) % others.length;
          const nextId = others[nextIdx];
          setCandidateAtomId(nextId);
          setStatus(`Bond target: ${describeAtom(nextId)}. Press 1-4 for bond order, Escape to cancel.`);
          return;
        }
        if (e.key === '1' || e.key === '2' || e.key === '3' || e.key === '4') {
          e.preventDefault();
          e.stopPropagation(); // don't also trigger the global tool-switch for 1-4
          const fromExists = molecule.atoms.some((a) => a.id === bondFromAtomId);
          const toAtom = candidateAtomId !== null ? molecule.atoms.find((a) => a.id === candidateAtomId) : undefined;
          if (fromExists && toAtom) {
            const alreadyBonded = molecule.bonds.some(
              (b) =>
                (b.from === bondFromAtomId && b.to === candidateAtomId) ||
                (b.from === candidateAtomId && b.to === bondFromAtomId)
            );
            if (alreadyBonded) {
              setStatus('These atoms are already bonded.');
            } else {
              pushUndo();
              addBond(bondFromAtomId, candidateAtomId as number, Number(e.key), 0);
              setStatus(`Bonded to ${ELEMENT_NAMES[toAtom.element] ?? toAtom.element}.`);
            }
          } else {
            setStatus('Bond creation cancelled — atom no longer exists.');
          }
          setBondFromAtomId(null);
          setCandidateAtomId(null);
          return;
        }
        return;
      }

      // Enter: start bond mode from the currently focused atom.
      if (e.key === 'Enter' && selectedId !== null) {
        const others = sortedAtomIds.filter((id) => id !== selectedId);
        if (others.length === 0) {
          setStatus('No other atoms to bond to.');
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        setBondFromAtomId(selectedId);
        setCandidateAtomId(null);
        setStatus(`Bond mode from ${describeAtom(selectedId)}. Arrow keys choose a target, 1-4 sets bond order, Escape cancels.`);
        return;
      }

      // Roving atom focus.
      if (isArrow && sortedAtomIds.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        const curIdx = selectedId !== null ? sortedAtomIds.indexOf(selectedId) : -1;
        const nextIdx = curIdx === -1 ? 0 : (curIdx + (forward ? 1 : -1) + sortedAtomIds.length) % sortedAtomIds.length;
        const nextId = sortedAtomIds[nextIdx];
        selectAtom(nextId, false);
        setSelectedAtomIdForInspector(nextId);
        setSelectedBondForInspector(null);
        setStatus(describeAtom(nextId));
        return;
      }

      // Shift+element: add a new atom, single-bonded to the focused one
      // (auto-positioned away from its existing bonds). Existing bare
      // letter-key tool-switching (useKeyboard.ts) is unaffected — its
      // lookup is case-sensitive on the lowercase key, so it never matches
      // Shift+letter's uppercase e.key.
      if (e.shiftKey) {
        const element = ELEMENT_NAMES[e.key.toUpperCase()] ? e.key.toUpperCase() : null;
        if (element) {
          e.preventDefault();
          e.stopPropagation();
          pushUndo();
          if (selectedId !== null) {
            const pos = calculateBondedAtomPosition(molecule, selectedId, BOND_LENGTH);
            const newId = addAtom(element, pos.x, pos.y);
            addBond(selectedId, newId, 1, 0);
            selectAtom(newId, false);
            setSelectedAtomIdForInspector(newId);
            setSelectedBondForInspector(null);
            setStatus(`Added ${ELEMENT_NAMES[element]}, bonded to 1 atom.`);
          } else {
            const newId = addAtom(element, 0, 0);
            selectAtom(newId, false);
            setSelectedAtomIdForInspector(newId);
            setSelectedBondForInspector(null);
            setStatus(`Added ${ELEMENT_NAMES[element]}.`);
          }
        }
      }
    },
    [molecule, sortedAtomIds, bondFromAtomId, candidateAtomId, selectAtom, setSelectedAtomIdForInspector, setSelectedBondForInspector, addAtom, addBond, pushUndo, setStatus, describeAtom]
  );

  return {
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onKeyDown,
    onFocus,
  };
}

// Helper function to find which arrow is clicked
function findClickedArrow(
  screenX: number,
  screenY: number,
  arrows: MechanismArrow[],
  molecule: MoleculeDto,
  canvasState: { offset: { x: number; y: number }; zoom: number }
): string | null {
  for (const arrow of arrows) {
    const path = calculateArrowPath(molecule, arrow, canvasState);
    if (path && distanceToCurve(screenX, screenY, path) < 10) {
      return arrow.id;
    }
  }
  return null;
}
