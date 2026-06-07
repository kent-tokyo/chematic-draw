import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useMoleculeStore } from '../../store/moleculeStore';
import { useCanvasStore } from '../../store/canvasStore';
import { useUIStore } from '../../store/uiStore';
import { useKeyboard } from '../../hooks/useKeyboard';
import { useCanvasInteraction } from '../../hooks/useCanvasInteraction';
import { CanvasRenderer } from './CanvasRenderer';
import { Tool } from '../../store/types';

export function MoleculeCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  // Hooks
  useKeyboard();
  const interactionHandlers = useCanvasInteraction();

  const molecule = useMoleculeStore((s) => s.molecule);
  const offset = useCanvasStore((s) => s.offset);
  const zoom = useCanvasStore((s) => s.zoom);
  const selectedAtomIds = useMoleculeStore((s) =>
    s.molecule.atoms.filter((a) => 'selected' in a && (a as any).selected).map((a) => a.id)
  );
  const selectedBondIds = useMoleculeStore((s) =>
    s.molecule.bonds.filter((b) => 'selected' in b && (b as any).selected).map((b) => b.id)
  );
  const canvasState = useMemo(() => ({ offset, zoom }), [offset, zoom]);
  const hoverAtomId = useCanvasStore((s) => s.hoverAtomId);
  const hoverBondId = useCanvasStore((s) => s.hoverBondId);
  const activeTool = useCanvasStore((s) => s.activeTool);
  const theme = useUIStore((s) => s.theme);
  const setZoom = useCanvasStore((s) => s.setZoom);
  const bondDragPos = useCanvasStore((s) => s.bondDragPos);
  const bondDragFrom = useCanvasStore((s) => s.bondDragFrom);

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

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const renderer = new CanvasRenderer(ctx, canvas.width, canvas.height);

    renderer.clear(theme);
    renderer.drawGrid(canvasState, theme);
    renderer.drawMolecule(molecule, canvasState, {
      theme,
      hoverAtomId,
      hoverBondId,
      selectedAtomIds,
      selectedBondIds,
      bondDragFrom,
      bondDragPos,
    });
  }, [molecule, canvasState, theme, hoverAtomId, hoverBondId, selectedAtomIds, selectedBondIds, bondDragPos, bondDragFrom]);

  // Handle zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(canvasState.zoom * delta);
  };

  const getCursor = () => {
    if (activeTool === Tool.Select) return 'default';
    if (activeTool === Tool.Eraser) return 'not-allowed';
    return 'crosshair';
  };

  return (
    <canvas
      ref={canvasRef}
      style={{
        flex: 1,
        cursor: getCursor(),
        backgroundColor: theme === 'dark' ? '#1e1e1e' : '#ffffff',
      }}
      onWheel={handleWheel}
      onMouseDown={interactionHandlers.onMouseDown}
      onMouseMove={interactionHandlers.onMouseMove}
      onMouseUp={interactionHandlers.onMouseUp}
      onContextMenu={interactionHandlers.onContextMenu}
    />
  );
}
