import { createExtensionHost, EXTENSION_API_VERSION, validateMoleculeDocument } from '../renderer/lib/documentCommands';
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

  test('keeps analysis providers read-only by contract', () => {
    const host = createExtensionHost();
    host.register({ id: 'analysis-plugin', version: '1.0.0', permissions: ['analysis:read'] }, [], [{ id: 'count', description: 'count atoms', analyze: (mol) => mol.atoms.length }]);
    expect(host.analyze('analysis-plugin', 'count', molecule)).toBe(1);
  });
});
