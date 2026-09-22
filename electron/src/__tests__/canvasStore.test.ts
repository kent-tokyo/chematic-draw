import { useCanvasStore } from '../renderer/store/canvasStore';

describe('canvas zoom', () => {
  beforeEach(() => {
    useCanvasStore.setState({ offset: { x: 0, y: 0 }, zoom: 1 });
  });

  it('keeps the cursor world coordinate fixed while zooming', () => {
    useCanvasStore.getState().zoomAt(2, 240, 130);
    const state = useCanvasStore.getState();
    expect(state.zoom).toBe(2);
    expect(state.offset).toEqual({ x: -240, y: -130 });
    expect((240 - state.offset.x) / state.zoom).toBe(240);
    expect((130 - state.offset.y) / state.zoom).toBe(130);
  });

  it('clamps zoom while preserving the same cursor anchor', () => {
    useCanvasStore.setState({ offset: { x: 30, y: 20 }, zoom: 2 });
    useCanvasStore.getState().zoomAt(100, 50, 40);
    const state = useCanvasStore.getState();
    expect(state.zoom).toBe(10);
    expect((50 - state.offset.x) / state.zoom).toBeCloseTo(10);
    expect((40 - state.offset.y) / state.zoom).toBeCloseTo(10);
  });
});

describe('canvas fit view', () => {
  it('fits the molecule with a margin and centers its bounds', () => {
    useCanvasStore.setState({ canvasSize: { width: 800, height: 600 }, offset: { x: 0, y: 0 }, zoom: 1 });
    useCanvasStore.getState().fitView({
      atoms: [
        { id: 1, element: 'C', x: 100, y: 50, charge: 0, atom_map: 0 },
        { id: 2, element: 'C', x: 300, y: 250, charge: 0, atom_map: 0 },
      ],
      bonds: [],
    });
    const state = useCanvasStore.getState();
    expect(state.zoom).toBe(2.6);
    expect(state.offset).toEqual({ x: -120, y: -90 });
    expect(state.worldToScreen(200, 150)).toEqual({ x: 400, y: 300 });
  });

  it('does not change the view when the canvas or molecule is empty', () => {
    useCanvasStore.setState({ canvasSize: { width: 0, height: 0 }, offset: { x: 12, y: 13 }, zoom: 2 });
    useCanvasStore.getState().fitView({ atoms: [], bonds: [] });
    expect(useCanvasStore.getState()).toMatchObject({ offset: { x: 12, y: 13 }, zoom: 2 });
  });
});
