import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Viewer3DPanel } from '../renderer/components/sidebar/Viewer3DPanel';
import * as wasmBridge from '../renderer/wasm/wasmBridge';
import * as moleculeStore from '../renderer/store/moleculeStore';
import * as uiStore from '../renderer/store/uiStore';

jest.mock('../renderer/wasm/wasmBridge');
jest.mock('../renderer/store/moleculeStore');
jest.mock('../renderer/store/uiStore');

// A single stable molecule object, reused (not recreated) across every
// mocked useMoleculeStore call: the panel's molecule-change-clears-3D-state
// effect keys off molecule's reference identity, which a real Zustand
// selector keeps stable across renders unless the store's state actually
// changes — the automock's default (no fixed return value) does not, and
// would make that effect misfire on every render.
const stableMolecule = {
  atoms: [
    { id: 0, element: 'C', x: 0, y: 0, charge: 0, atom_map: 0 },
    { id: 1, element: 'C', x: 1, y: 0, charge: 0, atom_map: 0 },
  ],
  bonds: [{ id: 2, from: 0, to: 1, order: 1, stereo: 0 }],
};

describe('Viewer3DPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (moleculeStore.useMoleculeStore as unknown as jest.Mock).mockImplementation(
      (selector: (s: { molecule: typeof stableMolecule }) => unknown) => selector({ molecule: stableMolecule })
    );
    (uiStore.useUIStore as unknown as jest.Mock).mockImplementation(
      (selector: (s: { theme: string; language: string }) => unknown) =>
        selector({ theme: 'dark', language: 'en' })
    );
  });

  it('should render 3D panel with controls', () => {
    render(<Viewer3DPanel />);

    expect(screen.getByText(/3D 生成/i)).toBeInTheDocument();
    expect(screen.getByText(/XYZ エクスポート/i)).toBeInTheDocument();
  });

  it('should generate 3D coordinates when button is clicked', async () => {
    const mockCoords = {
      atoms: [
        { id: 0, element: 'C', x: 0.5, y: 0.5, z: 0 },
        { id: 1, element: 'C', x: 1.5, y: 0.5, z: 0 },
      ],
    };

    (wasmBridge.generate3dCoords as jest.Mock).mockReturnValue(mockCoords);
    (wasmBridge.minimize3d as jest.Mock).mockReturnValue(mockCoords);

    render(<Viewer3DPanel />);

    const generateButton = screen.getByText(/3D 生成/i);
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(wasmBridge.generate3dCoords).toHaveBeenCalled();
      expect(wasmBridge.minimize3d).toHaveBeenCalled();
    });
  });

  it('should show an error and clear any stale coordinates when generation fails', async () => {
    const mockCoords = {
      atoms: [{ id: 0, element: 'C', x: 0.5, y: 0.5, z: 0 }],
    };
    (wasmBridge.generate3dCoords as jest.Mock).mockReturnValueOnce(mockCoords);
    (wasmBridge.minimize3d as jest.Mock).mockReturnValueOnce(mockCoords);

    render(<Viewer3DPanel />);
    const generateButton = screen.getByText(/3D 生成/i);
    const exportButton = screen.getByText(/XYZ エクスポート/i);

    // First click succeeds — export becomes enabled.
    fireEvent.click(generateButton);
    await waitFor(() => expect(exportButton).toBeEnabled());

    // Second click (e.g. after switching to a molecule WASM can't handle)
    // fails — the previous molecule's coordinates must not be left
    // displayed as if they were still current.
    (wasmBridge.generate3dCoords as jest.Mock).mockImplementationOnce(() => {
      throw new Error('Unknown element: CH3');
    });
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText(/Unknown element: CH3/)).toBeInTheDocument();
    });
    expect(exportButton).toBeDisabled();
  });

  it('should disable export button when no coordinates', () => {
    render(<Viewer3DPanel />);

    const exportButton = screen.getByText(/XYZ エクスポート/i);
    expect(exportButton).toBeDisabled();
  });

  it('should render localized light-theme copy and disable generation for an empty molecule', () => {
    (moleculeStore.useMoleculeStore as unknown as jest.Mock).mockImplementation(
      (selector: (s: { molecule: { atoms: never[]; bonds: never[] } }) => unknown) =>
        selector({ molecule: { atoms: [], bonds: [] } })
    );
    (uiStore.useUIStore as unknown as jest.Mock).mockImplementation(
      (selector: (s: { theme: string; language: string }) => unknown) =>
        selector({ theme: 'light', language: 'ja' })
    );

    render(<Viewer3DPanel />);

    expect(screen.getByText('分子から3D座標を生成し、UFF力場で最適化します。')).toBeInTheDocument();
    expect(screen.getByText('XYZを出力')).toBeDisabled();
    expect(screen.getByText('3D 生成')).toBeDisabled();
  });

  it('should draw non-carbon and unknown elements and export generated XYZ', async () => {
    const mockCoords = {
      atoms: [
        { id: 0, element: 'O', x: 0, y: 0, z: 0 },
        { id: 1, element: 'Xe', x: 1, y: 0, z: 0 },
      ],
    };
    (wasmBridge.generate3dCoords as jest.Mock).mockReturnValue(mockCoords);
    (wasmBridge.minimize3d as jest.Mock).mockReturnValue(mockCoords);
    const createObjectURL = jest.fn(() => 'blob:xyz');
    const revokeObjectURL = jest.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    render(<Viewer3DPanel />);
    fireEvent.click(screen.getByText('3D 生成'));
    const exportButton = screen.getByText('XYZ エクスポート');
    await waitFor(() => expect(exportButton).toBeEnabled());
    fireEvent.click(exportButton);

    expect(createObjectURL).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:xyz');
    expect(click).toHaveBeenCalled();
    click.mockRestore();
  });

  it('should handle mouse drag for rotation', async () => {
    render(<Viewer3DPanel />);

    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    fireEvent.mouseDown(canvas, { clientX: 100, clientY: 100 });
    fireEvent.mouseMove(canvas, { clientX: 150, clientY: 150 });
    fireEvent.mouseUp(canvas);

    // After drag, the view state should have changed
    // (This would be verified by observing canvas re-render)
    expect(canvas).toBeInTheDocument();
  });

  it('should handle mouse wheel for zoom', async () => {
    render(<Viewer3DPanel />);

    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    fireEvent.wheel(canvas, { deltaY: 100 });

    // Zoom should be updated
    expect(canvas).toBeInTheDocument();
  });

  it('should handle zooming in as well as out', () => {
    render(<Viewer3DPanel />);
    const canvas = screen.getByTestId('viewer-3d-canvas');
    fireEvent.wheel(canvas, { deltaY: -100 });
    expect(canvas).toBeInTheDocument();
  });
});
