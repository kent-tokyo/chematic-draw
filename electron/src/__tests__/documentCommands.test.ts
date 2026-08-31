import { createExtensionHost, EXTENSION_API_VERSION, MAX_MOLECULE_ATOMS, MAX_MOLECULE_BONDS, validateMoleculeDocument } from '../renderer/lib/documentCommands';
import { MoleculeDto } from '../renderer/store/types';

const molecule: MoleculeDto = {
  atoms: [{ id: 1, element: 'C', x: 0, y: 0, charge: 0, atom_map: 0 }],
  bonds: [],
};

describe('local extension document API', () => {
  test('exposes the frozen API major version', () => {
    expect(EXTENSION_API_VERSION).toBe(1);
    const host = createExtensionHost();
    expect(() => host.register({ id: 'future-plugin', version: '2.0.0', api_version: 2, permissions: [] })).toThrow(/API version/);
  });

  test('requires write permission and validates command output', () => {
    const host = createExtensionHost();
    expect(() => host.register({ id: 'unsafe', version: '1.0.0', permissions: [] }, [{ id: 'bad', description: 'bad', requiredPermission: 'document:write', execute: () => ({ atoms: [], bonds: [] }) }])).toThrow(/permission/);
    host.register({ id: 'safe-plugin', version: '1.0.0', permissions: ['document:write'] }, [{ id: 'add', description: 'add', requiredPermission: 'document:write', execute: ({ molecule }) => ({ ...molecule, atoms: [...molecule.atoms, { ...molecule.atoms[0], id: 2, x: 1 }] }) }]);
    expect(host.execute('safe-plugin', 'add', molecule).atoms).toHaveLength(2);
  });

  test('rejects a command that invents invalid references', () => {
    const host = createExtensionHost();
    host.register({ id: 'validator', version: '1.0.0', permissions: ['document:write'] }, [{ id: 'bad', description: 'bad', requiredPermission: 'document:write', execute: ({ molecule }) => ({ ...molecule, bonds: [{ id: 1, from: 1, to: 999, order: 1, stereo: 0 }] }) }]);
    expect(() => host.execute('validator', 'bad', molecule)).toThrow(/invalid document/);
    expect(validateMoleculeDocument(molecule)).toEqual([]);
  });

  test('rejects unsafe numeric fields and oversized documents', () => {
    const invalid = { ...molecule, atoms: [{ ...molecule.atoms[0], charge: 0.5 }], bonds: [{ id: 0, from: 1, to: 1, order: 1, stereo: 3 }] };
    expect(validateMoleculeDocument(invalid)).toEqual([
      'Atom 1 has invalid identity, coordinates, charge, or map',
      'Bond 0 has unsupported order or stereo',
    ]);
    expect(validateMoleculeDocument({ ...molecule, atoms: Array.from({ length: MAX_MOLECULE_ATOMS + 1 }, (_, id) => ({ ...molecule.atoms[0], id })) })).toEqual(expect.arrayContaining([expect.stringMatching(/atom limit/i)]));
    expect(validateMoleculeDocument({ ...molecule, bonds: Array.from({ length: MAX_MOLECULE_BONDS + 1 }, (_, id) => ({ id, from: 1, to: 1, order: 1, stereo: 0 })) })).toEqual(expect.arrayContaining([expect.stringMatching(/bond limit/i)]));
  });

  test('rejects non-object atom and bond entries without throwing', () => {
    expect(validateMoleculeDocument({ ...molecule, atoms: [null as never] })).toContain('Atom entry must be an object');
    expect(validateMoleculeDocument({ ...molecule, bonds: ['not-a-bond' as never] })).toContain('Bond entry must be an object');
  });

  test('keeps analysis providers read-only by contract', () => {
    const host = createExtensionHost();
    host.register({ id: 'analysis-plugin', version: '1.0.0', permissions: ['analysis:read'] }, [], [{ id: 'count', description: 'count atoms', analyze: (mol) => mol.atoms.length }]);
    expect(host.analyze('analysis-plugin', 'count', molecule)).toBe(1);
  });

  test('rejects invalid documents before invoking analysis providers', () => {
    const host = createExtensionHost();
    const analyze = jest.fn(() => 'unexpected');
    host.register({ id: 'safe-analysis', version: '1.0.0', permissions: ['analysis:read'] }, [], [{ id: 'check', description: 'check molecule', analyze }]);
    const invalid = { ...molecule, bonds: [{ id: 1, from: 1, to: 404, order: 1, stereo: 0 }] };

    expect(() => host.analyze('safe-analysis', 'check', invalid)).toThrow(/Analysis received an invalid document/);
    expect(analyze).not.toHaveBeenCalled();
  });
});
