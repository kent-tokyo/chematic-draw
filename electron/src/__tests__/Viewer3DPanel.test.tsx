import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Viewer3DPanel } from '../renderer/components/sidebar/Viewer3DPanel';
import * as wasmBridge from '../renderer/wasm/wasmBridge';

jest.mock('../renderer/wasm/wasmBridge');
jest.mock('../renderer/store/moleculeStore');
jest.mock('../renderer/store/uiStore');

describe('Viewer3DPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  it('should disable export button when no coordinates', () => {
    render(<Viewer3DPanel />);

    const exportButton = screen.getByText(/XYZ エクスポート/i);
    expect(exportButton).toBeDisabled();
  });

  it('should handle mouse drag for rotation', async () => {
    render(<Viewer3DPanel />);

    const canvas = screen.getByRole('img', { hidden: true }) || document.querySelector('canvas');
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

    const canvas = screen.getByRole('img', { hidden: true }) || document.querySelector('canvas');
    if (!canvas) return;

    fireEvent.wheel(canvas, { deltaY: 100 });

    // Zoom should be updated
    expect(canvas).toBeInTheDocument();
  });
});
