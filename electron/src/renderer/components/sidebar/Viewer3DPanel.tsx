import React, { useRef, useEffect, useState } from 'react';
import { useUIStore } from '../../store/uiStore';
import { useMoleculeStore } from '../../store/moleculeStore';
import * as wasmBridge from '../../wasm/wasmBridge';
import { Coords3dDto } from '../../wasm/wasmBridge';
import { moleculeStructureKey } from '../../lib/moleculeKey';

interface Viewer3dState {
  angleX: number;
  angleY: number;
  zoom: number;
}

export function Viewer3DPanel() {
  const theme = useUIStore((s) => s.theme);
  const language = useUIStore((s) => s.language);
  const molecule = useMoleculeStore((s) => s.molecule);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [viewerState, setViewerState] = useState<Viewer3dState>({
    angleX: 0.3,
    angleY: 0.5,
    zoom: 1.0,
  });
  const [coords3d, setCoords3d] = useState<Coords3dDto | null>(null);
  const [coords3dMoleculeKey, setCoords3dMoleculeKey] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  // Pointer coordinates are event bookkeeping, not rendered state. Keeping
  // them in a ref avoids an extra React render for every mousemove; the
  // rotation state below remains the only render-driving update.
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const [isGenerating, setIsGenerating] = useState(false);
  const generationRunRef = useRef(0);

  const moleculeKey = moleculeStructureKey(molecule);
  // Keep generated coordinates tied to the molecule that produced them. This
  // derives the visible result during render instead of clearing state from
  // an effect after a molecule edit, avoiding a one-render stale 3D preview.
  const displayCoords3d = coords3dMoleculeKey === moleculeKey ? coords3d : null;

  const bgColor = theme === 'dark' ? '#1a1f2a' : '#ffffff';
  const labelColor = theme === 'dark' ? '#a0a8b8' : '#555555';
  const accentColor = '#4d8dff';
  const isJapanese = language === 'ja';

  // Generate 3D coordinates
  const handleGenerate3d = async () => {
    if (molecule.atoms.length === 0) return;
    const generationRun = ++generationRunRef.current;
    try {
      setIsGenerating(true);
      setGenerationError(null);
      const raw3d = wasmBridge.generate3dCoords(molecule);
      const optimized = wasmBridge.minimize3d(molecule, raw3d);
      if (generationRun !== generationRunRef.current) return;
      setCoords3d(optimized);
      setCoords3dMoleculeKey(moleculeKey);
    } catch (err) {
      if (generationRun !== generationRunRef.current) return;
      // Clear any stale result rather than leaving a previous (possibly
      // different molecule's) 3D structure displayed as if it were current.
      setCoords3d(null);
      setCoords3dMoleculeKey(null);
      setGenerationError(err instanceof Error ? err.message : String(err));
    } finally {
      if (generationRun === generationRunRef.current) setIsGenerating(false);
    }
  };

  // Mouse interaction
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    const deltaX = e.clientX - lastMouseRef.current.x;
    const deltaY = e.clientY - lastMouseRef.current.y;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };

    setViewerState((prev) => ({
      ...prev,
      angleY: prev.angleY + deltaX * 0.01,
      angleX: prev.angleX + deltaY * 0.01,
    }));
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
  };

  const handleCanvasWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const scroll = e.deltaY > 0 ? 1 : -1;
    setViewerState((prev) => ({
      ...prev,
      zoom: Math.max(0.1, Math.min(8.0, prev.zoom * (1.0 + scroll * 0.1))),
    }));
  };

  // Render 3D scene using Canvas 2D API
  useEffect(() => {
    if (!canvasRef.current || !displayCoords3d) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    const { angleX, angleY, zoom } = viewerState;
    const sinX = Math.sin(angleX);
    const cosX = Math.cos(angleX);
    const sinY = Math.sin(angleY);
    const cosY = Math.cos(angleY);
    const center = { x: width / 2, y: height / 2 };
    const scale = zoom * 60;

    // Project atoms to 2D
    interface Proj {
      screen: { x: number; y: number };
      z: number;
      element: string;
      radius: number;
    }

    const projs: Proj[] = displayCoords3d.atoms.map((atom) => {
      const [x, y, z] = rotate(atom.x, atom.y, atom.z, sinX, cosX, sinY, cosY);
      const radius = vdwRadius(atom.element) * zoom * 16;
      return {
        screen: {
          x: center.x + x * scale,
          y: center.y - y * scale,
        },
        z,
        element: atom.element,
        radius: Math.max(4, Math.min(30, radius)),
      };
    });

    // Draw bonds
    ctx.strokeStyle = '#999999';
    ctx.lineWidth = 2;
    for (let i = 0; i < projs.length; i++) {
      for (let j = i + 1; j < projs.length; j++) {
        // Simple distance-based bond heuristic
        const dx = projs[i].screen.x - projs[j].screen.x;
        const dy = projs[i].screen.y - projs[j].screen.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 150 && dist > 5) {
          ctx.beginPath();
          ctx.moveTo(projs[i].screen.x, projs[i].screen.y);
          ctx.lineTo(projs[j].screen.x, projs[j].screen.y);
          ctx.stroke();
        }
      }
    }

    // Sort by Z (back to front)
    projs.sort((a, b) => a.z - b.z);

    // Draw atoms
    for (const proj of projs) {
      const color = elementColor(proj.element, (proj.z + 5.0) / 10.0);

      // Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.arc(proj.screen.x + 2, proj.screen.y + 2, proj.radius, 0, Math.PI * 2);
      ctx.fill();

      // Atom
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(proj.screen.x, proj.screen.y, proj.radius, 0, Math.PI * 2);
      ctx.fill();

      // Label
      if (proj.element !== 'C' && proj.radius > 8) {
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.round(proj.radius * 0.7)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(proj.element, proj.screen.x, proj.screen.y);
      }
    }

    // Instructions
    ctx.fillStyle = labelColor;
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(isJapanese ? 'ドラッグで回転｜スクロールでズーム' : 'Drag to rotate  |  Scroll to zoom', 8, 8);
  }, [displayCoords3d, viewerState, bgColor, labelColor, isJapanese]);

  // Download XYZ
  const handleExportXyz = () => {
    if (!displayCoords3d) return;
    let xyz = `${displayCoords3d.atoms.length}\n\n`;
    for (const atom of displayCoords3d.atoms) {
      xyz += `${atom.element} ${atom.x.toFixed(6)} ${atom.y.toFixed(6)} ${atom.z.toFixed(6)}\n`;
    }
    const blob = new Blob([xyz], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'molecule_3d.xyz';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Canvas */}
      <div
        style={{
          border: `1px solid #3a4a57`,
          borderRadius: '4px',
          overflow: 'hidden',
          backgroundColor: bgColor,
          height: '300px',
        }}
      >
        <canvas
          ref={canvasRef}
          data-testid="viewer-3d-canvas"
          role="img"
          aria-label={isJapanese ? '3D分子ビューア。ドラッグで回転、スクロールでズーム' : '3D molecule viewer. Drag to rotate, scroll to zoom'}
          width={400}
          height={300}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
          onWheel={handleCanvasWheel}
          style={{ display: 'block', cursor: isDragging ? 'grabbing' : 'grab' }}
        />
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={handleGenerate3d}
          disabled={isGenerating || molecule.atoms.length === 0}
          style={{
            flex: 1,
            padding: '8px',
            backgroundColor: accentColor,
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: 'bold',
            opacity: isGenerating || molecule.atoms.length === 0 ? 0.5 : 1,
          }}
        >
          {isGenerating ? (isJapanese ? '生成中…' : 'Generating...') : '3D 生成'}
        </button>
        <button
          onClick={handleExportXyz}
          disabled={!displayCoords3d}
          style={{
            flex: 1,
            padding: '8px',
            backgroundColor: accentColor,
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: 'bold',
            opacity: !displayCoords3d ? 0.5 : 1,
          }}
        >
          {isJapanese ? 'XYZを出力' : 'XYZ エクスポート'}
        </button>
      </div>

      {generationError && (
        <div style={{ fontSize: '10px', color: '#f26d6d', padding: '8px', backgroundColor: theme === 'dark' ? '#3a2a2a' : '#fdecea', borderRadius: '4px' }}>
          3D 座標を生成できませんでした: {generationError}
        </div>
      )}

      {/* Info */}
      <div style={{ fontSize: '9px', color: labelColor, lineHeight: '1.4' }}>
        {isJapanese ? '分子から3D座標を生成し、UFF力場で最適化します。' : 'Generate 3D coordinates from the molecule and optimize them with the UFF force field.'}
      </div>
    </div>
  );
}

function rotate(x: number, y: number, z: number, sinX: number, cosX: number, sinY: number, cosY: number): [number, number, number] {
  const x1 = x * cosY + z * sinY;
  const z1 = -x * sinY + z * cosY;
  const y2 = y * cosX - z1 * sinX;
  const z2 = y * sinX + z1 * cosX;
  return [x1, y2, z2];
}

function vdwRadius(elem: string): number {
  const vdwRadii: { [key: string]: number } = {
    H: 1.2, C: 1.7, N: 1.55, O: 1.52, F: 1.47, P: 1.8, S: 1.8,
    Cl: 1.75, Br: 1.85, I: 1.98, B: 1.92, Si: 2.1,
  };
  return vdwRadii[elem] || 1.5;
}

function elementColor(elem: string, depth: number): string {
  const brightnessFactor = Math.max(0.3, Math.min(1.0, depth * 0.6 + 0.4));
  const colors: { [key: string]: [number, number, number] } = {
    C: [128, 128, 128], N: [70, 130, 180], O: [255, 0, 0], F: [144, 224, 254],
    P: [255, 165, 0], S: [255, 200, 124], Cl: [144, 224, 80], Br: [165, 42, 42],
    I: [148, 0, 211], H: [240, 240, 240], B: [255, 200, 124],
  };
  const rgb = colors[elem] || [200, 200, 200];
  const adjusted = rgb.map((c) => Math.round(c * brightnessFactor)) as [number, number, number];
  return `rgb(${adjusted.join(',')})`;
}
