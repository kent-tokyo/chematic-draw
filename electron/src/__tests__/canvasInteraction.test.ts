import { hasBondDragSource } from '../renderer/hooks/useCanvasInteraction';

describe('canvas bond-drag guard', () => {
  it('accepts imported atom id 0 as a valid bond source', () => {
    expect(hasBondDragSource(0)).toBe(true);
    expect(hasBondDragSource(12)).toBe(true);
    expect(hasBondDragSource(undefined)).toBe(false);
  });
});
