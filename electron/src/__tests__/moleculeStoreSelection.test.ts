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
});
