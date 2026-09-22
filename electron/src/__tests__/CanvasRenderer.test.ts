import { CanvasRenderer } from '../renderer/components/canvas/CanvasRenderer';

describe('CanvasRenderer grid', () => {
  it('covers the complete canvas after a centered document applies a large offset', () => {
    const segments: Array<{ from: [number, number]; to: [number, number] }> = [];
    let from: [number, number] = [0, 0];
    let to: [number, number] = [0, 0];
    const context = {
      beginPath: jest.fn(),
      moveTo: jest.fn((x: number, y: number) => { from = [x, y]; }),
      lineTo: jest.fn((x: number, y: number) => { to = [x, y]; }),
      stroke: jest.fn(() => { segments.push({ from, to }); }),
      strokeStyle: '',
      lineWidth: 0,
    } as unknown as CanvasRenderingContext2D;

    new CanvasRenderer(context, 1000, 600).drawGrid({ offset: { x: 528, y: 346 }, zoom: 1 }, 'dark');

    const vertical = segments.filter(({ from: start, to: end }) => start[1] === 0 && end[1] === 600);
    const horizontal = segments.filter(({ from: start, to: end }) => start[0] === 0 && end[0] === 1000);
    expect(vertical.at(-1)?.from[0]).toBeGreaterThan(950);
    expect(horizontal.at(-1)?.from[1]).toBeGreaterThan(550);
  });
});
