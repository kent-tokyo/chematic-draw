import { SchematicMoleculeElement, defineSchematicMoleculeElement } from '../../../packages/chematic-web/src/index';

describe('chematic-molecule Web Component', () => {
  beforeAll(() => defineSchematicMoleculeElement());

  it('registers without Electron and renders a validated molecule as SVG', () => {
    const element = document.createElement('chematic-molecule') as SchematicMoleculeElement;
    element.molecule = { atoms: [{ id: 1, element: 'O', x: 0, y: 0, charge: 0, atom_map: 0 }], bonds: [] };
    document.body.append(element);
    expect(element.querySelector('svg')).not.toBeNull();
    expect(element).toHaveAttribute('role', 'img');
    expect(element.molecule.atoms[0].element).toBe('O');
  });

  it('emits an error and keeps the previous molecule for invalid attribute JSON', () => {
    const element = document.createElement('chematic-molecule') as SchematicMoleculeElement;
    const error = jest.fn();
    element.addEventListener('schematic-error', error);
    element.molecule = { atoms: [], bonds: [] };
    document.body.append(element);
    element.setAttribute('value', '{bad');
    expect(error).toHaveBeenCalledTimes(1);
    expect(element.molecule.atoms).toEqual([]);
  });
});
