import { renderMoleculeSvg } from '../../../packages/chematic-web/src/index';

describe('schematic web embedding contract', () => {
  it('rejects duplicate IDs and unsupported bond values before rendering', () => {
    expect(() => renderMoleculeSvg({
      atoms: [
        { id: 1, element: 'C', x: 0, y: 0, charge: 0, atom_map: 0 },
        { id: 1, element: 'O', x: 10, y: 0, charge: 0, atom_map: 0 },
      ],
      bonds: [],
    })).toThrow(/Invalid atom/);

    expect(() => renderMoleculeSvg({
      atoms: [{ id: 1, element: 'C', x: 0, y: 0, charge: 0, atom_map: 0 }, { id: 2, element: 'O', x: 10, y: 0, charge: 0, atom_map: 0 }],
      bonds: [{ id: 1, from: 1, to: 2, order: 9, stereo: 0 }],
    })).toThrow(/Invalid bond/);
  });
});
