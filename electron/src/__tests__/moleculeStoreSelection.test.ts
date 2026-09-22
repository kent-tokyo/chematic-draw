// test-setup.ts globally mocks this module (a narrow selector-only stub, no
// getState/addAtom/selectAll) so component tests can render without a real
// store — opt back into the real implementation, since this test exercises
// the store's own logic, not a component that merely reads from it.
jest.unmock('../renderer/store/moleculeStore');
import { useMoleculeStore } from '../renderer/store/moleculeStore';

// Regression test for Ctrl+A: useKeyboard.ts used to preventDefault() and
// then do nothing (`// TODO: selectAll()`), so it silently swallowed the
// browser's native "select all" in every text input on the page while
// never actually selecting anything on the canvas. moleculeStore had no
// selectAll action at all — only per-atom/per-bond selectAtom/selectBond
// and a deselectAll that this mirrors.

describe('moleculeStore.selectAll', () => {
  it('marks every atom and bond as selected', () => {
    const store = useMoleculeStore.getState();
    const a1 = store.addAtom('C', 0, 0);
    const a2 = store.addAtom('C', 10, 0);
    useMoleculeStore.getState().addBond(a1, a2, 1, 0);

    useMoleculeStore.getState().selectAll();

    const state = useMoleculeStore.getState();
    expect(state.molecule.atoms.every((a) => a.selected)).toBe(true);
    expect(state.molecule.bonds.every((b) => b.selected)).toBe(true);
  });

  it('deselectAll clears a prior selectAll', () => {
    useMoleculeStore.getState().addAtom('C', 0, 0);
    useMoleculeStore.getState().selectAll();
    useMoleculeStore.getState().deselectAll();

    const state = useMoleculeStore.getState();
    expect(state.molecule.atoms.every((a) => !a.selected)).toBe(true);
  });

  it('selectRegion selects enclosed atoms and only their internal bonds', () => {
    useMoleculeStore.setState({ molecule: { atoms: [], bonds: [] }, undoStack: [], redoStack: [] });
    const first = useMoleculeStore.getState().addAtom('C', 10, 10);
    const second = useMoleculeStore.getState().addAtom('O', 30, 10);
    const outside = useMoleculeStore.getState().addAtom('N', 80, 10);
    useMoleculeStore.getState().addBond(first, second, 1, 0);
    useMoleculeStore.getState().addBond(second, outside, 1, 0);

    useMoleculeStore.getState().selectRegion(
      { left: 0, top: 0, right: 50, bottom: 50 },
      { offset: { x: 0, y: 0 }, zoom: 1 },
      false,
    );

    const state = useMoleculeStore.getState();
    expect(state.molecule.atoms.filter((atom) => atom.selected).map((atom) => atom.id)).toEqual([first, second]);
    expect(state.molecule.bonds.filter((bond) => bond.selected).map((bond) => [bond.from, bond.to])).toEqual([[first, second]]);
  });

  it('translates selected atoms without changing unselected atoms', () => {
    useMoleculeStore.setState({ molecule: { atoms: [
      { id: 1, element: 'C', x: 1, y: 2, charge: 0, atom_map: 0, selected: true },
      { id: 2, element: 'O', x: 10, y: 20, charge: 0, atom_map: 0 },
    ], bonds: [] } });
    useMoleculeStore.getState().translateSelectedAtoms(3, -4);
    expect(useMoleculeStore.getState().molecule.atoms.map(({ x, y }) => [x, y])).toEqual([[4, -2], [10, 20]]);
  });
});
