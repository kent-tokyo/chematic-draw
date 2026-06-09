import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useMoleculeStore } from '../../store/moleculeStore';
import { useCanvasStore } from '../../store/canvasStore';
import { useUIStore } from '../../store/uiStore';
import { useKeyboard } from '../../hooks/useKeyboard';
import { useCanvasInteraction } from '../../hooks/useCanvasInteraction';
import { useContextMenu } from '../../hooks/useContextMenu';
import { CanvasRenderer } from './CanvasRenderer';
import { Tool } from '../../store/types';
import { mergeTemplateIntoMolecule } from '../../lib/templateMerge';
import * as wasmBridge from '../../wasm/wasmBridge';

export function MoleculeCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  // Hooks
  useKeyboard();
  const interactionHandlers = useCanvasInteraction();
  const { handleContextMenu } = useContextMenu();

  const molecule = useMoleculeStore((s) => s.molecule);
  const hoverAtomId = useCanvasStore((s) => s.hoverAtomId);
  const hoverBondId = useCanvasStore((s) => s.hoverBondId);
  const activeTool = useCanvasStore((s) => s.activeTool);
  const theme = useUIStore((s) => s.theme);
  const bondDragPos = useCanvasStore((s) => s.bondDragPos);
  const bondDragFrom = useCanvasStore((s) => s.bondDragFrom);

  const selectedAtomIds = useMemo(() =>
    molecule.atoms.filter((a) => 'selected' in a && (a as any).selected).map((a) => a.id),
    [molecule]
  );
  const selectedBondIds = useMemo(() =>
    molecule.bonds.filter((b) => 'selected' in b && (b as any).selected).map((b) => b.id),
    [molecule]
  );

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

    const { offset, zoom } = useCanvasStore.getState();
    const renderer = new CanvasRenderer(ctx, canvas.width, canvas.height);
    const canvasState = { offset, zoom };

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
  }, [molecule, theme, hoverAtomId, hoverBondId, selectedAtomIds, selectedBondIds, bondDragPos, bondDragFrom]);

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
      style={{
        flex: 1,
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
