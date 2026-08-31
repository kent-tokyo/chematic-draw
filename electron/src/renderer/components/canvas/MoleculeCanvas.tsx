import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { useMoleculeStore } from '../../store/moleculeStore';
import { useCanvasStore } from '../../store/canvasStore';
import { useUIStore } from '../../store/uiStore';
import { useMechanismStore } from '../../store/mechanismStore';
import { useKeyboard } from '../../hooks/useKeyboard';
import { useCanvasInteraction } from '../../hooks/useCanvasInteraction';
import { useContextMenu } from '../../hooks/useContextMenu';
import { CanvasRenderer } from './CanvasRenderer';
import { MoleculeDto, Tool } from '../../store/types';
import { mergeTemplateIntoMolecule } from '../../lib/templateMerge';
import { createExtensionHost } from '../../lib/documentCommands';

const documentCommandHost = createExtensionHost();
documentCommandHost.register(
  { id: 'core', version: '1.0.0', permissions: ['document:write'] },
  [{
    id: 'template.insert',
    description: 'Insert a validated molecule template',
    requiredPermission: 'document:write',
    execute: ({ molecule, payload }) => {
      const { template, offsetX, offsetY } = payload as { template: MoleculeDto; offsetX: number; offsetY: number };
      return mergeTemplateIntoMolecule(molecule, template, offsetX, offsetY);
    },
  }]
);
import { calculateArrowPath, distanceToCurve } from '../../lib/arrowGeometry';
import { useReactionSchemeStore } from '../../store/reactionSchemeStore';
import * as wasmBridge from '../../wasm/wasmBridge';

export function MoleculeCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Lives in canvasStore, not local state — centerViewOnLoad (triggered
  // from renderer.tsx's fresh-document load sites) needs to read it
  // regardless of which component last measured the canvas.
  const canvasSize = useCanvasStore((s) => s.canvasSize);
  const setCanvasSize = useCanvasStore((s) => s.setCanvasSize);
  const pendingCenter = useCanvasStore((s) => s.pendingCenter);
  const centerViewOnLoad = useCanvasStore((s) => s.centerViewOnLoad);

  // Hooks
  useKeyboard();
  const interactionHandlers = useCanvasInteraction();
  const { handleContextMenu } = useContextMenu();

  // Get state directly to avoid selector infinite loops
  const molecule = useMoleculeStore((s) => s.molecule);
  const hoverAtomId = useCanvasStore.getState().hoverAtomId;
  const hoverBondId = useCanvasStore.getState().hoverBondId;
  const activeTool = useCanvasStore.getState().activeTool;
  const theme = useUIStore.getState().theme;
  const bondDragPos = useCanvasStore.getState().bondDragPos;
  const bondDragFrom = useCanvasStore.getState().bondDragFrom;
  const activeSidebarPanel = useUIStore((s) => s.activeSidebarPanel);
  const mechanismArrows = useMechanismStore((s) => s.arrows);
  const selectedArrowId = useMechanismStore((s) => s.selectedArrowId);
  const hoverArrowId = useMechanismStore((s) => s.hoverArrowId);
  const scheme = useReactionSchemeStore((s) => s.scheme);
  const getCurrentStep = useReactionSchemeStore((s) => s.getCurrentStep);
  const schemeLayout = useReactionSchemeStore((s) => s.schemeLayout);
  const selectedStepIndex = useReactionSchemeStore((s) => s.selectedStepIndex);
  const hoveredStepIndex = useReactionSchemeStore((s) => s.hoveredStepIndex);
  const recalculateLayout = useReactionSchemeStore((s) => s.recalculateLayout);

  const selectedAtomIds = useMemo(() =>
    molecule.atoms.filter((a) => a.selected).map((a) => a.id),
    [molecule]
  );
  const selectedBondIds = useMemo(() =>
    molecule.bonds.filter((b) => b.selected).map((b) => b.id),
    [molecule]
  );

  // If in a reaction scheme, show current step's products; otherwise show the molecule
  const displayMolecule = useMemo(() => {
    if (scheme && scheme.steps.length > 0) {
      const currentStep = getCurrentStep();
      if (currentStep && currentStep.products.length > 0) {
        // Show first product of current step
        return currentStep.products[0];
      }
    }
    return molecule;
  }, [scheme, getCurrentStep, molecule]);

  // Accessible name for the canvas (role="img" below) — this <canvas> has no
  // DOM representation of atoms/bonds at all, so without this a screen
  // reader perceives nothing here. Atom/bond counts are free (already in
  // state); formula/MW need a WASM call, too expensive to run on every
  // drag-move frame (updateAtom fires continuously while dragging an atom),
  // so that part is debounced the same way the settings autosave above is.
  const atomCount = displayMolecule.atoms.length;
  const bondCount = displayMolecule.bonds.length;
  const [formulaSummary, setFormulaSummary] = useState('');
  useEffect(() => {
    if (atomCount === 0) {
      setFormulaSummary('');
      return;
    }
    const timeout = setTimeout(() => {
      try {
        const props = wasmBridge.getProperties(displayMolecule);
        setFormulaSummary(`${props.formula}, molecular weight ${props.molecular_weight.toFixed(2)}, `);
      } catch {
        // Mid-edit states (e.g. a dangling bond being drawn) aren't always
        // valid molecules — leave the cheap atom/bond-count summary as-is.
        setFormulaSummary('');
      }
    }, 500);
    return () => clearTimeout(timeout);
  }, [displayMolecule, atomCount]);

  const canvasLabel =
    atomCount === 0
      ? 'Molecular structure canvas, empty'
      : `Molecular structure: ${formulaSummary}${atomCount} atom${atomCount === 1 ? '' : 's'}, ${bondCount} bond${bondCount === 1 ? '' : 's'}`;

  // Handle canvas resize. A ResizeObserver on the canvas's own parent (not
  // window's 'resize' event) catches every layout-driven size change, not
  // just whole-window resizes — the sidebar opening/closing changes the
  // canvas's flex-allocated width without the window itself resizing, which
  // a window-level listener would silently miss, leaving the canvas at its
  // old (now wrong) pixel size and its content visually stretched.
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        const rect = canvasRef.current.parentElement?.getBoundingClientRect();
        if (rect) {
          setCanvasSize({ width: rect.width, height: rect.height });
          canvasRef.current.width = rect.width;
          canvasRef.current.height = rect.height;
        }
      }
    };

    handleResize();
    const parent = canvasRef.current?.parentElement;
    if (!parent) return;
    const observer = new ResizeObserver(handleResize);
    observer.observe(parent);
    return () => observer.disconnect();
  }, [setCanvasSize]);

  // Center a freshly-loaded document (initial sample, file open, crash
  // recovery restore — flagged via requestCenterOnLoad from renderer.tsx)
  // once the canvas has actually been measured. Runs on both canvasSize
  // and pendingCenter changes so it doesn't matter which becomes true
  // first: the resize effect above measures the canvas independently of
  // when a document load happens to land.
  useEffect(() => {
    if (pendingCenter && canvasSize.width > 0) {
      centerViewOnLoad(molecule);
    }
  }, [pendingCenter, canvasSize, molecule, centerViewOnLoad]);

  // Recalculate layout when scheme or canvas size changes
  useEffect(() => {
    if (scheme) {
      recalculateLayout();
    }
  }, [scheme, canvasSize, recalculateLayout]);

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { offset, zoom } = useCanvasStore.getState();
    const renderer = new CanvasRenderer(ctx, canvas.width, canvas.height);
    const canvasState = { offset, zoom };

    renderer.clear(theme);

    // Check if we should render full scheme or single step
    if (scheme && scheme.viewMode === 'scheme' && schemeLayout) {
      // Draw full reaction scheme
      renderer.drawReactionScheme(scheme, schemeLayout, {
        theme,
        selectedStepIndex,
        hoveredStepIndex,
      });
    } else {
      // Draw single step (existing code)
      renderer.drawGrid(canvasState, theme);
      const renderMol = displayMolecule || molecule;
      renderer.drawMolecule(renderMol, canvasState, {
        theme,
        hoverAtomId,
        hoverBondId,
        selectedAtomIds,
        selectedBondIds,
        bondDragFrom,
        bondDragPos,
      });

      // Draw step indicator if in scheme
      if (scheme && scheme.steps.length > 0) {
        ctx.fillStyle = theme === 'dark' ? '#90caf9' : '#1976d2';
        ctx.font = '12px sans-serif';
        ctx.fillText(
          `Step ${scheme.currentStepIndex + 1}/${scheme.steps.length} - Products`,
          10,
          20
        );
      }
    }

    // Draw mechanism arrows if panel is active
    if (activeSidebarPanel === 'mechanism' && mechanismArrows.length > 0) {
      renderer.drawMechanismArrows(molecule, mechanismArrows, canvasState, {
        theme,
        selectedArrowId,
        hoverArrowId,
      });
    }
  }, [displayMolecule, molecule, theme, hoverAtomId, hoverBondId, selectedAtomIds, selectedBondIds, bondDragPos, bondDragFrom, activeSidebarPanel, mechanismArrows, selectedArrowId, hoverArrowId, scheme, schemeLayout, selectedStepIndex, hoveredStepIndex, canvasSize]);

  // Handle zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const { zoom } = useCanvasStore.getState();
    const { setZoom } = useCanvasStore.getState();
    setZoom(zoom * delta);
  };

  const getCursor = () => {
    if (activeTool === Tool.Select) return 'default';
    if (activeTool === Tool.Eraser) return 'not-allowed';
    return 'crosshair';
  };

  const setMolecule = useMoleculeStore((s) => s.setMolecule);
  const pushUndo = useMoleculeStore((s) => s.pushUndo);
  const setStatus = useUIStore((s) => s.setStatus);

  const handleDragOver = (e: React.DragEvent<HTMLCanvasElement>) => {
    if (e.dataTransfer.types.includes('application/x-template-smiles')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLCanvasElement>) => {
    // Don't allow template drops in full scheme view
    if (scheme?.viewMode === 'scheme') {
      e.preventDefault();
      return;
    }

    e.preventDefault();
    const smiles = e.dataTransfer.getData('application/x-template-smiles');
    const name = e.dataTransfer.getData('application/x-template-name');

    if (!smiles || !canvasRef.current) return;

    try {
      // Get drop coordinates
      const { screenToWorld } = useCanvasStore.getState();
      const rect = canvasRef.current.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const worldPos = screenToWorld(screenX, screenY);

      // Parse template
      const templateMol = wasmBridge.parseMolecule(smiles);

      // Calculate centroid
      const centroid = {
        x: templateMol.atoms.reduce((sum, a) => sum + a.x, 0) / (templateMol.atoms.length || 1),
        y: templateMol.atoms.reduce((sum, a) => sum + a.y, 0) / (templateMol.atoms.length || 1),
      };

      // Merge into molecule
      const offset = {
        x: worldPos.x - centroid.x,
        y: worldPos.y - centroid.y,
      };

      pushUndo();
      const merged = documentCommandHost.execute('core', 'template.insert', molecule, {
        template: templateMol,
        offsetX: offset.x,
        offsetY: offset.y,
      });
      setMolecule(merged);
      setStatus(`Inserted ${name}`);
    } catch (err) {
      setStatus(`Failed to insert template: ${(err as Error).message}`);
    }
  };

  return (
    <canvas
      ref={canvasRef}
      data-testid="molecule-canvas"
      role="img"
      aria-label={canvasLabel}
      tabIndex={0}
      onFocus={interactionHandlers.onFocus}
      onKeyDown={interactionHandlers.onKeyDown}
      style={{
        flex: 1,
        // Canvas is a replaced element — its `width`/`height` attributes (set
        // in the resize handler below) become its intrinsic size, and flex
        // items default to `min-width: auto`, which for replaced elements
        // resolves to that intrinsic size. Without this override, the canvas
        // refuses to shrink below whatever width it was last resized to,
        // squeezing the sidebar down to ~0px instead of its real width.
        minWidth: 0,
        minHeight: 0,
        cursor: getCursor(),
        backgroundColor: theme === 'dark' ? '#1e1e1e' : '#ffffff',
      }}
      onWheel={handleWheel}
      onMouseDown={interactionHandlers.onMouseDown}
      onMouseMove={interactionHandlers.onMouseMove}
      onMouseUp={interactionHandlers.onMouseUp}
      onContextMenu={handleContextMenu}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    />
  );
}
