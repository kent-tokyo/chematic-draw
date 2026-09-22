import { useCallback, useRef, useMemo, useState } from 'react';
import { useMoleculeStore } from '../store/moleculeStore';
import { useCanvasStore } from '../store/canvasStore';
import { useUIStore } from '../store/uiStore';
import { useMechanismStore } from '../store/mechanismStore';
import { Tool, MechanismArrow, MoleculeDto } from '../store/types';
import { hitTestAtom, hitTestBond, calculateBondedAtomPosition } from '../lib/geometry';
import { calculateArrowPath, distanceToCurve } from '../lib/arrowGeometry';
import { getStepBoxAtPosition } from '../lib/schemeLayout';
import { useReactionSchemeStore } from '../store/reactionSchemeStore';
import { insertCarbonRing } from '../lib/ringTemplate';
import { ATOMIC_NUMBERS_BY_ELEMENT } from '../lib/chemicalElements';

const DRAG_THRESHOLD = 4;
const BOND_LENGTH = 60;

/** Atom id 0 is valid for imported molecules, so do not use truthiness here. */
export function hasBondDragSource(atomId: number | undefined): atomId is number {
  return atomId !== undefined;
}

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
  selectionRect: { left: number; top: number; right: number; bottom: number } | null;
}

export function useCanvasInteraction(): CanvasInteractionHandlers {
  const dragStateRef = useRef<{
    type: 'none' | 'atom-drag' | 'bond-drag' | 'drawing-drag' | 'pan' | 'selection';
    startX: number;
    startY: number;
    atomId?: number;
    atomDragOffsets?: Array<{ id: number; dx: number; dy: number }>;
    bondFrom?: number;
    pushedUndo?: boolean;
    additive?: boolean;
    drawingKind?: 'arrow' | 'bracket';
  }>({ type: 'none', startX: 0, startY: 0 });
  const [selectionRect, setSelectionRect] = useState<{ left: number; top: number; right: number; bottom: number } | null>(null);

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
  const setMolecule = useMoleculeStore((s) => s.setMolecule);
  const updateAtom = useMoleculeStore((s) => s.updateAtom);
  const addBond = useMoleculeStore((s) => s.addBond);
  const removeBond = useMoleculeStore((s) => s.removeBond);
  const removeAtom = useMoleculeStore((s) => s.removeAtom);
  const addDrawingText = useMoleculeStore((s) => s.addDrawingText);
  const addDrawingArrow = useMoleculeStore((s) => s.addDrawingArrow);
  const addDrawingBracket = useMoleculeStore((s) => s.addDrawingBracket);
  const removeDrawingItem = useMoleculeStore((s) => s.removeDrawingItem);
  const selectAtom = useMoleculeStore((s) => s.selectAtom);
  const selectBond = useMoleculeStore((s) => s.selectBond);
  const selectRegion = useMoleculeStore((s) => s.selectRegion);
  const translateSelectedAtoms = useMoleculeStore((s) => s.translateSelectedAtoms);
  const deselectAll = useMoleculeStore((s) => s.deselectAll);
  const pushUndo = useMoleculeStore((s) => s.pushUndo);
  const setSelectedAtomIdForInspector = useUIStore((s) => s.setSelectedAtomIdForInspector);
  const setSelectedBondIdForInspector = useUIStore((s) => s.setSelectedBondIdForInspector);
  const setActiveSidebarPanel = useUIStore((s) => s.setActiveSidebarPanel);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);

  const showInspector = useCallback(() => {
    setSidebarOpen(true);
    setActiveSidebarPanel('inspector');
  }, [setActiveSidebarPanel, setSidebarOpen]);

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
      setSelectionRect(null);

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
        const bondId = atomId === null ? hitTestBond(molecule, screenX, screenY, canvasState) : null;
        if (atomId !== null) {
          // Context-menu right-clicks must not collapse an existing
          // multi-selection into the atom under the pointer. The dedicated
          // context-menu handler records the target and updates the Inspector;
          // selection mutation belongs to the primary-button path only.
          if (e.button === 2) return;
          const worldPos = screenToWorld(screenX, screenY);
          const selectedAtoms = molecule.atoms.filter((atom) => atom.selected);
          const dragAtoms = selectedAtoms.some((atom) => atom.id === atomId) ? selectedAtoms : molecule.atoms.filter((atom) => atom.id === atomId);
          dragStateRef.current = {
            type: 'atom-drag',
            startX: screenX,
            startY: screenY,
            atomId,
            atomDragOffsets: dragAtoms.map((atom) => ({ id: atom.id, dx: atom.x - worldPos.x, dy: atom.y - worldPos.y })),
          };
          selectAtom(atomId, e.shiftKey || e.ctrlKey);
          // Tracks "most recently clicked," not "currently selected" — a
          // Shift/Ctrl-click that toggles this atom back off still leaves
          // the Inspector showing it, same as right-click's "last thing you
          // pointed at" behavior. Clearing the bond keeps the two mutually
          // exclusive — otherwise a stale bond right-clicked earlier would
          // render alongside this atom's fields.
          setSelectedAtomIdForInspector(atomId);
          setSelectedBondIdForInspector(null);
          showInspector();
        } else if (bondId !== null) {
          selectBond(bondId, e.shiftKey || e.ctrlKey);
          setSelectedBondIdForInspector(bondId);
          setSelectedAtomIdForInspector(null);
          showInspector();
        } else if (e.shiftKey) {
          dragStateRef.current = { type: 'selection', startX: screenX, startY: screenY, additive: e.shiftKey };
          setSelectionRect({ left: screenX, top: screenY, right: screenX, bottom: screenY });
        } else {
          deselectAll();
          setSelectedAtomIdForInspector(null);
          setSelectedBondIdForInspector(null);
          showInspector();
        }
      } else if (activeTool === Tool.Eraser) {
        const atomId = hitTestAtom(molecule, screenX, screenY, canvasState);
        const bondId = hitTestBond(molecule, screenX, screenY, canvasState);
        const drawingId = hitTestDrawing(molecule, screenX, screenY, canvasState);
        if (drawingId !== null) {
          pushUndo();
          removeDrawingItem(drawingId);
        } else if (atomId !== null) {
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
        activeTool === Tool.Bond_Aromatic ||
        activeTool === Tool.Bond_Wedge ||
        activeTool === Tool.Bond_Dash
      ) {
        const atomId = hitTestAtom(molecule, screenX, screenY, canvasState);
        if (atomId !== null) {
          dragStateRef.current = { type: 'bond-drag', startX: screenX, startY: screenY, bondFrom: atomId };
          pushUndo();
        }
      } else if (activeTool === Tool.Ring_5 || activeTool === Tool.Ring_6 || activeTool === Tool.Ring_Aromatic) {
        const worldPos = screenToWorld(screenX, screenY);
        pushUndo();
        const sides = activeTool === Tool.Ring_5 ? 5 : 6;
        setMolecule(insertCarbonRing(molecule, worldPos.x, worldPos.y, sides, BOND_LENGTH, activeTool === Tool.Ring_Aromatic));
        setStatus(`Inserted ${sides}-membered ${activeTool === Tool.Ring_Aromatic ? 'aromatic ' : ''}ring.`);
      } else if (activeTool === Tool.Atom_Label) {
        const value = window.prompt('Element symbol', 'Cl')?.trim();
        if (!value) return;
        const element = value[0].toUpperCase() + value.slice(1).toLowerCase();
        if (!(element in ATOMIC_NUMBERS_BY_ELEMENT)) {
          setStatus(`Unknown element: ${value}`);
          return;
        }
        const atomId = hitTestAtom(molecule, screenX, screenY, canvasState);
        pushUndo();
        if (atomId !== null) updateAtom(atomId, { element });
        else {
          const worldPos = screenToWorld(screenX, screenY);
          addAtom(element, worldPos.x, worldPos.y);
        }
        setStatus(`Set element to ${element}.`);
      } else if (activeTool === Tool.Text) {
        const text = window.prompt('Text')?.trim();
        if (!text) return;
        const worldPos = screenToWorld(screenX, screenY);
        pushUndo();
        addDrawingText({ x: worldPos.x, y: worldPos.y, text });
        setStatus('Inserted text annotation.');
      } else if (activeTool === Tool.Reaction_Arrow || activeTool === Tool.Bracket) {
        dragStateRef.current = {
          type: 'drawing-drag',
          startX: screenX,
          startY: screenY,
          drawingKind: activeTool === Tool.Reaction_Arrow ? 'arrow' : 'bracket',
        };
      } else if (activeTool.startsWith('atom_')) {
        const element = activeTool === Tool.Atom_C ? 'C' : activeTool.split('_')[1].toUpperCase();
        const atomId = hitTestAtom(molecule, screenX, screenY, canvasState);
        if (atomId !== null) {
          // Change existing atom
          pushUndo();
          updateAtom(atomId, { element });
        } else {
          // Add new atom
          const worldPos = screenToWorld(screenX, screenY);
          pushUndo();
          addAtom(element, worldPos.x, worldPos.y);
        }
      }
    },
    [molecule, activeTool, activeSidebarPanel, arrowSelectionMode, pendingSourceAtomId, mechanismArrows, selectAtom, selectBond, deselectAll, removeAtom, removeBond, removeDrawingItem, updateAtom, addAtom, addDrawingText, setMolecule, pushUndo, setStatus, scheme, schemeLayout, setSelectedStepIndex, goToStep, setViewMode, setSelectedAtomIdForInspector, setSelectedBondIdForInspector, showInspector]
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
      } else if (dragStateRef.current.type === 'atom-drag' && dragStateRef.current.atomId !== undefined) {
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
          const offsets = dragStateRef.current.atomDragOffsets ?? [{ id: dragStateRef.current.atomId, dx: 0, dy: 0 }];
          for (const atom of offsets) updateAtom(atom.id, { x: worldPos.x + atom.dx, y: worldPos.y + atom.dy });
        }
      } else if (dragStateRef.current.type === 'bond-drag') {
        setBondDrag(dragStateRef.current.bondFrom, { x: screenX, y: screenY });
      } else if (dragStateRef.current.type === 'selection') {
        setSelectionRect({
          left: Math.min(dragStateRef.current.startX, screenX),
          top: Math.min(dragStateRef.current.startY, screenY),
          right: Math.max(dragStateRef.current.startX, screenX),
          bottom: Math.max(dragStateRef.current.startY, screenY),
        });
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

      if (dragStateRef.current.type === 'bond-drag' && hasBondDragSource(dragStateRef.current.bondFrom)) {
        const targetAtomId = hitTestAtom(molecule, screenX, screenY, canvasState);
        if (targetAtomId !== null && targetAtomId !== dragStateRef.current.bondFrom) {
          // Add bond
          const order = activeTool === Tool.Bond_Double ? 2 : activeTool === Tool.Bond_Triple ? 3 : activeTool === Tool.Bond_Aromatic ? 4 : 1;
          const stereo = activeTool === Tool.Bond_Wedge ? 1 : activeTool === Tool.Bond_Dash ? 2 : 0;
          addBond(dragStateRef.current.bondFrom, targetAtomId, order, stereo);
        }
        setBondDrag(null);
      }

      if (dragStateRef.current.type === 'drawing-drag') {
        const distance = Math.hypot(screenX - dragStateRef.current.startX, screenY - dragStateRef.current.startY);
        if (distance >= DRAG_THRESHOLD) {
          const from = useCanvasStore.getState().screenToWorld(dragStateRef.current.startX, dragStateRef.current.startY);
          const to = useCanvasStore.getState().screenToWorld(screenX, screenY);
          pushUndo();
          if (dragStateRef.current.drawingKind === 'arrow') {
            addDrawingArrow({ x1: from.x, y1: from.y, x2: to.x, y2: to.y, kind: 'forward' });
            setStatus('Inserted reaction arrow.');
          } else {
            addDrawingBracket({ x1: from.x, y1: from.y, x2: to.x, y2: to.y });
            setStatus('Inserted bracket.');
          }
        }
      }

      if (dragStateRef.current.type === 'selection') {
        const left = Math.min(dragStateRef.current.startX, screenX);
        const right = Math.max(dragStateRef.current.startX, screenX);
        const top = Math.min(dragStateRef.current.startY, screenY);
        const bottom = Math.max(dragStateRef.current.startY, screenY);
        if (right - left >= DRAG_THRESHOLD || bottom - top >= DRAG_THRESHOLD) {
          selectRegion({ left, top, right, bottom }, { offset, zoom }, dragStateRef.current.additive === true);
          setStatus('Selected objects in region.');
        }
        setSelectionRect(null);
      }

      dragStateRef.current = { type: 'none', startX: 0, startY: 0 };
    },
    [molecule, activeTool, addBond, addDrawingArrow, addDrawingBracket, pushUndo, setBondDrag, selectRegion, setStatus]
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
      setSelectedBondIdForInspector(null);
      setStatus(`Canvas focused. ${describeAtom(sortedAtomIds[0])}.`);
    } else {
      setStatus('Canvas focused, empty. Press Shift+C, Shift+N, Shift+O, Shift+S, or Shift+P to add an atom.');
    }
  }, [molecule, sortedAtomIds, selectAtom, setSelectedAtomIdForInspector, setSelectedBondIdForInspector, setStatus, describeAtom]);

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

      if (e.altKey && isArrow && molecule.atoms.some((atom) => atom.selected)) {
        e.preventDefault();
        e.stopPropagation();
        const distance = e.shiftKey ? 10 : 1;
        const dx = e.key === 'ArrowRight' ? distance : e.key === 'ArrowLeft' ? -distance : 0;
        const dy = e.key === 'ArrowDown' ? distance : e.key === 'ArrowUp' ? -distance : 0;
        pushUndo();
        translateSelectedAtoms(dx, dy);
        setStatus(`Moved selected atoms ${distance} unit${distance === 1 ? '' : 's'}.`);
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
        setSelectedBondIdForInspector(null);
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
            setSelectedBondIdForInspector(null);
            setStatus(`Added ${ELEMENT_NAMES[element]}, bonded to 1 atom.`);
          } else {
            const newId = addAtom(element, 0, 0);
            selectAtom(newId, false);
            setSelectedAtomIdForInspector(newId);
            setSelectedBondIdForInspector(null);
            setStatus(`Added ${ELEMENT_NAMES[element]}.`);
          }
        }
      }
    },
    [molecule, sortedAtomIds, bondFromAtomId, candidateAtomId, translateSelectedAtoms, selectAtom, setSelectedAtomIdForInspector, setSelectedBondIdForInspector, addAtom, addBond, pushUndo, setStatus, describeAtom]
  );

  return {
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onKeyDown,
    onFocus,
    selectionRect,
  };
}

function hitTestDrawing(
  molecule: MoleculeDto,
  x: number,
  y: number,
  state: { offset: { x: number; y: number }; zoom: number }
): string | null {
  const drawing = molecule.drawing;
  if (!drawing) return null;
  const screen = (wx: number, wy: number) => ({ x: wx * state.zoom + state.offset.x, y: wy * state.zoom + state.offset.y });
  for (const item of drawing.texts) {
    const p = screen(item.x, item.y);
    if (Math.hypot(x - p.x, y - p.y) < 18) return item.id;
  }
  for (const item of [...drawing.arrows, ...drawing.brackets]) {
    const a = screen(item.x1, item.y1);
    const b = screen(item.x2, item.y2);
    const length2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
    const t = length2 === 0 ? 0 : Math.max(0, Math.min(1, ((x - a.x) * (b.x - a.x) + (y - a.y) * (b.y - a.y)) / length2));
    if (Math.hypot(x - (a.x + t * (b.x - a.x)), y - (a.y + t * (b.y - a.y))) < 10) return item.id;
  }
  return null;
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
