import { formatCoordsAsXyz } from '../renderer/lib/xyzExport';

describe('XYZ export formatter', () => {
  it('serializes finite coordinates deterministically', () => {
    expect(formatCoordsAsXyz({ atoms: [{ id: 1, element: 'C', x: 1 / 3, y: 0, z: -2 }] })).toBe('1\n\nC 0.333333 0.000000 -2.000000\n');
  });

  it.each([
    [{ atoms: [{ id: 1, element: 'C', x: Number.NaN, y: 0, z: 0 }] }, 'finite coordinates'],
    [{ atoms: [{ id: 1, element: '', x: 0, y: 0, z: 0 }] }, 'element'],
    [{ atoms: [{ id: 1, element: 'C', x: 0, y: 0, z: 0 }, { id: 1, element: 'O', x: 0, y: 0, z: 0 }] }, 'unique integers'],
  ] as const)('rejects invalid coordinate input (%s)', (coords, message) => {
    expect(() => formatCoordsAsXyz(coords as unknown as Parameters<typeof formatCoordsAsXyz>[0])).toThrow(message);
  });
});
