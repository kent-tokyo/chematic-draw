jest.unmock('../renderer/store/moleculeStore');
import { useMoleculeStore } from '../renderer/store/moleculeStore';

describe('drawing annotations', () => {
  beforeEach(() => useMoleculeStore.getState().clear());

  it('stores text, arrows, and brackets in the undoable document model', () => {
    const store = useMoleculeStore.getState();
    store.pushUndo();
    store.addDrawingText({ x: 1, y: 2, text: 'heat' });
    store.addDrawingArrow({ x1: 0, y1: 0, x2: 20, y2: 0, kind: 'forward' });
    store.addDrawingBracket({ x1: -5, y1: -5, x2: 25, y2: 10 });
    expect(useMoleculeStore.getState().molecule.drawing).toMatchObject({
      texts: [expect.objectContaining({ text: 'heat' })],
      arrows: [expect.objectContaining({ kind: 'forward' })],
      brackets: [expect.objectContaining({ x2: 25 })],
    });
    expect(useMoleculeStore.getState().undo()).toBe(true);
    expect(useMoleculeStore.getState().molecule.drawing).toBeUndefined();
  });
});
