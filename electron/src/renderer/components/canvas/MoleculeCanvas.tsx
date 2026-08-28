import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { useMoleculeStore } from '../../store/moleculeStore';
import { useCanvasStore } from '../../store/canvasStore';
import { useUIStore } from '../../store/uiStore';
import { useMechanismStore } from '../../store/mechanismStore';
import { useKeyboard } from '../../hooks/useKeyboard';
import { useCanvasInteraction } from '../../hooks/useCanvasInteraction';
import { useContextMenu } from '../../hooks/useContextMenu';
import { CanvasRenderer } from './CanvasRenderer';
import { Tool } from '../../store/types';
import { mergeTemplateIntoMolecule } from '../../lib/templateMerge';
import { calculateArrowPath, distanceToCurve } from '../../lib/arrowGeometry';
import { useReactionSchemeStore } from '../../store/reactionSchemeStore';
import * as wasmBridge from '../../wasm/wasmBridge';

export function MoleculeCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

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
    molecule.atoms.filter((a) => 'selected' in a && (a as any).selected).map((a) => a.id),
    [molecule]
  );
  const selectedBondIds = useMemo(() =>
    molecule.bonds.filter((b) => 'selected' in b && (b as any).selected).map((b) => b.id),
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

  // Handle canvas resize
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
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
  }, [displayMolecule, molecule, theme, hoverAtomId, hoverBondId, selectedAtomIds, selectedBondIds, bondDragPos, bondDragFrom, activeSidebarPanel, mechanismArrows, selectedArrowId, hoverArrowId, scheme, schemeLayout, selectedStepIndex, hoveredStepIndex]);

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
      const merged = mergeTemplateIntoMolecule(molecule, templateMol, offset.x, offset.y);
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
