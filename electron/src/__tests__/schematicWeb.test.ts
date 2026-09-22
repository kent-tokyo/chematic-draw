import { SchematicMoleculeElement, defineSchematicMoleculeElement, renderMoleculeSvg, serializeMolecule, summarizeEmbeddedMolecule, validateEmbeddedMolecule } from '../../../packages/chematic-web/src/index';
import { handleMoleculeWorkerRequest } from '../../../packages/chematic-web/src/worker';
import { installMoleculeWorker } from '../../../packages/chematic-web/src/worker-entry';
import { createMoleculeWorkerClient } from '../../../packages/chematic-web/src/workerClient';
import type { MoleculeWorkerLike } from '../../../packages/chematic-web/src/workerClient';
import { toSchematicMoleculeElementProps } from '../../../packages/chematic-web/src/react';
import * as webPackage from '../../../packages/chematic-web/package.json';
import { applyMoleculeEdit } from '../../../packages/chematic-web/src/editor';
import { SchematicMoleculeEditorElement, defineSchematicMoleculeEditorElement } from '../../../packages/chematic-web/src/editorElement';

describe('chematic-molecule Web Component', () => {
  beforeAll(() => defineSchematicMoleculeElement());
  beforeAll(() => defineSchematicMoleculeEditorElement());

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

  it('bubbles viewer errors so an embed host can observe invalid attributes', () => {
    const host = document.createElement('div');
    const element = document.createElement('chematic-molecule') as SchematicMoleculeElement;
    const error = jest.fn();
    host.addEventListener('schematic-error', error);
    host.append(element);
    document.body.append(host);
    element.setAttribute('value', '{bad');
    expect(error).toHaveBeenCalledTimes(1);
    expect((error.mock.calls[0][0] as CustomEvent).composed).toBe(true);
  });

  it('provides deterministic dependency-free serialization and SVG rendering', () => {
    const molecule = { atoms: [{ id: 1, element: 'C', x: 0, y: 0, charge: 0, atom_map: 0 }], bonds: [] };
    expect(serializeMolecule(molecule)).toBe(JSON.stringify(molecule));
    expect(renderMoleculeSvg(molecule)).toBe(renderMoleculeSvg(molecule));
  });

  it('rejects dangling bond endpoints before rendering', () => {
    expect(() => serializeMolecule({ atoms: [{ id: 1, element: 'C', x: 0, y: 0, charge: 0, atom_map: 0 }], bonds: [{ id: 1, from: 1, to: 9, order: 1, stereo: 0 }] })).toThrow(/endpoints/);
  });

  it('exposes the same validation and serialization gate to embedded hosts', () => {
    const molecule = { atoms: [{ id: 1, element: 'C', x: 0, y: 0, charge: 0, atom_map: 0 }], bonds: [] };
    const element = document.createElement('chematic-molecule') as SchematicMoleculeElement;
    element.molecule = molecule;
    document.body.append(element);
    expect(element.serialize()).toBe(JSON.stringify(molecule));
    expect(element.validate()).toEqual([]);
    expect(validateEmbeddedMolecule(molecule)).toEqual([]);
  });

  it('rejects oversized molecules before rendering', () => {
    const oversized = { atoms: Array.from({ length: 100_001 }, (_, id) => ({ id, element: 'C', x: id, y: 0, charge: 0, atom_map: 0 })), bonds: [] };
    expect(() => renderMoleculeSvg(oversized)).toThrow(/exceeds/);
  });

  it('keeps the Worker entrypoint DOM- and Electron-independent', () => {
    const molecule = { atoms: [{ id: 1, element: 'C', x: 0, y: 0, charge: 0, atom_map: 0 }], bonds: [] };
    expect(handleMoleculeWorkerRequest({ type: 'serialize', molecule })).toEqual({ ok: true, type: 'serialize', value: JSON.stringify(molecule) });
    expect(handleMoleculeWorkerRequest({ type: 'validate', molecule })).toEqual({ ok: true, type: 'validate', value: '[]' });
    expect(handleMoleculeWorkerRequest({ type: 'render', molecule })).toMatchObject({ ok: true, type: 'render' });
    expect(handleMoleculeWorkerRequest({ type: 'render', molecule: { ...molecule, bonds: [{ id: 1, from: 1, to: 9, order: 1, stereo: 0 }] } })).toEqual({ ok: false, error: 'Invalid bond endpoints: 1' });
  });

  it('returns deterministic dependency-free molecule summaries through the Worker boundary', () => {
    const molecule = {
      atoms: [
        { id: 1, element: 'C', x: 0, y: 0, charge: 1, atom_map: 0, hydrogen_count: 3 },
        { id: 2, element: 'O', x: 1, y: 0, charge: 0, atom_map: 0, hydrogen_count: 1 },
      ],
      bonds: [{ id: 1, from: 1, to: 2, order: 1, stereo: 0 }],
    };
    const expected = { formula: 'CH4O', atomCount: 2, heavyAtomCount: 2, bondCount: 1, formalCharge: 1, connectedComponentCount: 1, approximateMolecularWeight: 32.042 };
    expect(summarizeEmbeddedMolecule(molecule)).toEqual(expected);
    expect(handleMoleculeWorkerRequest({ type: 'summarize', molecule })).toEqual({ ok: true, type: 'summarize', value: JSON.stringify(expected) });
    expect(handleMoleculeWorkerRequest({ type: 'summarize', molecule: { ...molecule, bonds: [] } })).toEqual({ ok: true, type: 'summarize', value: JSON.stringify({ ...expected, bondCount: 0, connectedComponentCount: 2 }) });
    expect(handleMoleculeWorkerRequest({ type: 'summarize', molecule: { ...molecule, atoms: [{ ...molecule.atoms[0], element: 'Xe' }, molecule.atoms[1]] } })).toEqual({ ok: true, type: 'summarize', value: JSON.stringify({ ...expected, formula: 'H4OXe', approximateMolecularWeight: null }) });
  });

  it('applies validated immutable edits through the Worker boundary', () => {
    const molecule = { atoms: [{ id: 1, element: 'C', x: 0, y: 0, charge: 0, atom_map: 0 }], bonds: [] };
    expect(handleMoleculeWorkerRequest({
      type: 'edit',
      molecule,
      edit: { type: 'update-atom', atomId: 1, updates: { element: 'N', charge: 1 } },
    })).toEqual({
      ok: true,
      type: 'edit',
      value: JSON.stringify({ atoms: [{ id: 1, element: 'N', x: 0, y: 0, charge: 1, atom_map: 0 }], bonds: [] }),
    });
    expect(molecule.atoms[0]).toMatchObject({ element: 'C', charge: 0 });
    expect(handleMoleculeWorkerRequest({
      type: 'edit',
      molecule,
      edit: { type: 'update-atom', atomId: 9, updates: { element: 'N' } },
    })).toEqual({ ok: false, error: 'Atom id does not exist: 9' });
  });

  it('applies a bounded edit batch atomically through the Worker boundary', () => {
    const molecule = { atoms: [{ id: 1, element: 'C', x: 0, y: 0, charge: 0, atom_map: 0 }], bonds: [] };
    expect(handleMoleculeWorkerRequest({
      type: 'edit-batch', molecule,
      edits: [
        { type: 'update-atom', atomId: 1, updates: { element: 'N' } },
        { type: 'update-atom', atomId: 1, updates: { charge: 1 } },
      ],
    })).toEqual({
      ok: true,
      type: 'edit-batch',
      value: JSON.stringify({ atoms: [{ id: 1, element: 'N', x: 0, y: 0, charge: 1, atom_map: 0 }], bonds: [] }),
    });
    expect(molecule.atoms[0]).toMatchObject({ element: 'C', charge: 0 });
    expect(handleMoleculeWorkerRequest({
      type: 'edit-batch', molecule,
      edits: [
        { type: 'update-atom', atomId: 1, updates: { element: 'N' } },
        { type: 'update-atom', atomId: 9, updates: { charge: 1 } },
      ],
    })).toEqual({ ok: false, error: 'Atom id does not exist: 9' });
    expect(handleMoleculeWorkerRequest({ type: 'edit-batch', molecule, edits: Array.from({ length: 257 }, () => ({ type: 'update-atom', atomId: 1, updates: {} })) })).toEqual({ ok: false, error: 'Molecule edit batch must contain at most 256 edits' });
  });

  it('publishes explicit Web Component and Worker entrypoints without false tree-shaking metadata', () => {
    expect(webPackage.exports['./worker']).toEqual({ types: './src/worker.ts', default: './src/worker.ts' });
    expect(webPackage.exports['./worker-entry']).toEqual({ types: './src/worker-entry.ts', default: './src/worker-entry.ts' });
    expect(webPackage.exports['./worker-client']).toEqual({ types: './src/workerClient.ts', default: './src/workerClient.ts' });
    expect(webPackage.exports['./react']).toEqual({ types: './src/react.ts', default: './src/react.ts' });
    expect(webPackage.exports['./editor']).toEqual({ types: './src/editor.ts', default: './src/editor.ts' });
    expect(webPackage.exports['./editor-element']).toEqual({ types: './src/editorElement.ts', default: './src/editorElement.ts' });
    expect(webPackage.dependencies).toEqual({ '@chematic/contract': '1.0.7' });
    expect(webPackage.private).toBe(true);
    expect(webPackage.sideEffects).toEqual(['./src/index.ts']);
  });

  it('adapts React-shaped props without importing React at runtime', () => {
    const molecule = { atoms: [{ id: 1, element: 'C', x: 0, y: 0, charge: 0, atom_map: 0 }], bonds: [] };
    expect(toSchematicMoleculeElementProps({ molecule, ariaLabel: 'Carbon', readOnly: true })).toEqual({ value: JSON.stringify(molecule), 'aria-label': 'Carbon', readonly: '' });
  });

  it('applies immutable headless edits with validation', () => {
    const molecule = { atoms: [{ id: 1, element: 'C', x: 0, y: 0, charge: 0, atom_map: 0 }], bonds: [] };
    const edited = applyMoleculeEdit(molecule, { type: 'add-atom', atom: { id: 2, element: 'O', x: 1, y: 0, charge: 0, atom_map: 0 } });
    expect(edited.atoms).toHaveLength(2);
    expect(molecule.atoms).toHaveLength(1);
    expect(() => applyMoleculeEdit(edited, { type: 'add-bond', bond: { id: 1, from: 2, to: 9, order: 1, stereo: 0 } })).toThrow(/rejected/);
    expect(applyMoleculeEdit(edited, { type: 'remove-atom', atomId: 2 })).toEqual(molecule);
    expect(() => applyMoleculeEdit(molecule, { type: 'remove-atom', atomId: 9 })).toThrow(/does not exist/);
    expect(() => applyMoleculeEdit(molecule, { type: 'remove-bond', bondId: 9 })).toThrow(/does not exist/);
  });

  it('supports chemistry-aware atom and bond updates through the embedding contract', () => {
    const molecule = { atoms: [{ id: 1, element: 'C', x: 0, y: 0, charge: 0, atom_map: 0 }, { id: 2, element: 'O', x: 1, y: 0, charge: 0, atom_map: 0 }], bonds: [{ id: 1, from: 1, to: 2, order: 1, stereo: 0 }] };
    const atomEdited = applyMoleculeEdit(molecule, { type: 'update-atom', atomId: 1, updates: { element: 'N', charge: 1 } });
    expect(atomEdited.atoms[0]).toMatchObject({ element: 'N', charge: 1 });
    const bondEdited = applyMoleculeEdit(atomEdited, { type: 'update-bond', bondId: 1, updates: { order: 2, stereo: 1 } });
    expect(bondEdited.bonds[0]).toMatchObject({ order: 2, stereo: 1 });
    expect(molecule.atoms[0].element).toBe('C');
    expect(() => applyMoleculeEdit(molecule, { type: 'update-atom', atomId: 9, updates: { element: 'N' } })).toThrow(/does not exist/);
  });

  it('keeps editing explicitly opt-in and emits validated molecule changes', () => {
    const element = document.createElement('chematic-molecule-editor') as SchematicMoleculeEditorElement;
    element.molecule = { atoms: [], bonds: [] };
    const change = jest.fn();
    element.addEventListener('molecule-change', change);
    document.body.append(element);
    const next = element.applyEdit({ type: 'add-atom', atom: { id: 1, element: 'C', x: 0, y: 0, charge: 0, atom_map: 0 } });
    expect(next.atoms).toHaveLength(1);
    expect(change).toHaveBeenCalledTimes(1);
    expect((change.mock.calls[0][0] as CustomEvent).detail.edit.type).toBe('add-atom');
    expect((change.mock.calls[0][0] as CustomEvent).detail.direction).toBe('edit');
    expect(element.canUndo).toBe(true);
    expect(element.canRedo).toBe(false);
    expect(element.serialize()).toBe(JSON.stringify(next));
    expect(element.validate()).toEqual([]);
    expect(element).toHaveAttribute('aria-readonly', 'false');
    expect(element.undo()?.atoms).toEqual([]);
    expect(element.canRedo).toBe(true);
    expect((change.mock.calls[1][0] as CustomEvent).detail.direction).toBe('undo');
    expect(element.redo()?.atoms).toHaveLength(1);
    expect((change.mock.calls[2][0] as CustomEvent).detail.direction).toBe('redo');
    element.setAttribute('readonly', '');
    expect(element).toHaveAttribute('aria-readonly', 'true');
    expect(() => element.applyEdit({ type: 'remove-atom', atomId: 1 })).toThrow(/read-only/);
    element.removeAttribute('readonly');
    element.dispose();
    expect(element.innerHTML).toBe('');
    expect(() => element.applyEdit({ type: 'remove-atom', atomId: 1 })).toThrow(/disposed/);
  });

  it('applies editor batches atomically as one history entry and event', () => {
    const element = document.createElement('chematic-molecule-editor') as SchematicMoleculeEditorElement;
    element.molecule = { atoms: [], bonds: [] };
    const change = jest.fn();
    element.addEventListener('molecule-change', change);
    document.body.append(element);
    const next = element.applyEdits([
      { type: 'add-atom', atom: { id: 1, element: 'C', x: 0, y: 0, charge: 0, atom_map: 0 } },
      { type: 'add-atom', atom: { id: 2, element: 'O', x: 1, y: 0, charge: 0, atom_map: 0 } },
      { type: 'add-bond', bond: { id: 1, from: 1, to: 2, order: 1, stereo: 0 } },
    ]);
    expect(next.bonds).toHaveLength(1);
    expect(change).toHaveBeenCalledTimes(1);
    expect((change.mock.calls[0][0] as CustomEvent).detail.edit).toBeNull();
    expect((change.mock.calls[0][0] as CustomEvent).detail.edits).toHaveLength(3);
    expect(element.undo()?.atoms).toEqual([]);
    expect(element.canRedo).toBe(true);
  });

  it('leaves editor state and history unchanged when a batch fails', () => {
    const element = document.createElement('chematic-molecule-editor') as SchematicMoleculeEditorElement;
    element.molecule = { atoms: [], bonds: [] };
    const errors = jest.fn();
    element.addEventListener('schematic-error', errors);
    document.body.append(element);
    expect(() => element.applyEdits([
      { type: 'add-atom', atom: { id: 1, element: 'C', x: 0, y: 0, charge: 0, atom_map: 0 } },
      { type: 'add-bond', bond: { id: 1, from: 1, to: 9, order: 1, stereo: 0 } },
    ])).toThrow(/rejected/);
    expect(element.molecule).toEqual({ atoms: [], bonds: [] });
    expect(element.canUndo).toBe(false);
    expect(errors).toHaveBeenCalledTimes(1);
  });

  it('keeps pointer drawing opt-in and translates valid gestures into edits', () => {
    const element = document.createElement('chematic-molecule-editor') as SchematicMoleculeEditorElement;
    const change = jest.fn();
    element.addEventListener('molecule-change', change);
    document.body.append(element);
    const inertEvent = new Event('pointerup', { bubbles: true });
    Object.defineProperties(inertEvent, { clientX: { value: 20 }, clientY: { value: 20 } });
    element.dispatchEvent(inertEvent);
    expect(element.molecule.atoms).toEqual([]);
    element.setAttribute('interaction', 'draw');
    const drawEvent = (type: string, x: number, y: number, target: EventTarget = element): Event => {
      const event = new Event(type, { bubbles: true });
      Object.defineProperties(event, { clientX: { value: x }, clientY: { value: y } });
      target.dispatchEvent(event);
      return event;
    };
    const svg = element.querySelector('svg')!;
    Object.defineProperty(svg, 'getBoundingClientRect', { value: () => ({ left: 0, top: 0, width: 120, height: 80 }) });
    drawEvent('pointerdown', 60, 40, svg);
    drawEvent('pointerup', 60, 40, svg);
    expect(element.molecule.atoms).toHaveLength(1);
    expect(change).toHaveBeenCalledTimes(1);
  });

  it('keeps keyboard editing opt-in and exposes accessible history shortcuts', () => {
    const element = document.createElement('chematic-molecule-editor') as SchematicMoleculeEditorElement;
    element.molecule = { atoms: [], bonds: [] };
    document.body.append(element);
    element.applyEdit({ type: 'add-atom', atom: { id: 1, element: 'C', x: 0, y: 0, charge: 0, atom_map: 0 } });
    element.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }));
    expect(element.molecule.atoms).toHaveLength(1);
    element.setAttribute('keyboard', 'edit');
    expect(element).toHaveAttribute('tabindex', '0');
    expect(element).toHaveAttribute('aria-keyshortcuts');
    element.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }));
    expect(element.molecule.atoms).toEqual([]);
    element.dispatchEvent(new KeyboardEvent('keydown', { key: 'y', ctrlKey: true, bubbles: true }));
    expect(element.molecule.atoms).toHaveLength(1);
    element.setAttribute('readonly', '');
    element.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }));
    expect(element.molecule.atoms).toHaveLength(1);
  });

  it('reports invalid editor edits without mutating the current molecule', () => {
    const element = document.createElement('chematic-molecule-editor') as SchematicMoleculeEditorElement;
    element.molecule = { atoms: [], bonds: [] };
    const error = jest.fn();
    element.addEventListener('schematic-error', error);
    expect(() => element.applyEdit({ type: 'remove-atom', atomId: 9 })).toThrow(/does not exist/);
    expect(error).toHaveBeenCalledTimes(1);
    expect(element.molecule.atoms).toEqual([]);
  });

  it('reports read-only edits through the documented error event and bubbles changes', () => {
    const host = document.createElement('div');
    const element = document.createElement('chematic-molecule-editor') as SchematicMoleculeEditorElement;
    const error = jest.fn();
    const change = jest.fn();
    host.addEventListener('schematic-error', error);
    host.addEventListener('molecule-change', change);
    element.molecule = { atoms: [], bonds: [] };
    host.append(element);
    document.body.append(host);
    element.setAttribute('readonly', '');
    expect(() => element.applyEdit({ type: 'add-atom', atom: { id: 1, element: 'C', x: 0, y: 0, charge: 0, atom_map: 0 } })).toThrow(/read-only/);
    expect(error).toHaveBeenCalledTimes(1);
    element.removeAttribute('readonly');
    element.applyEdit({ type: 'add-atom', atom: { id: 1, element: 'C', x: 0, y: 0, charge: 0, atom_map: 0 } });
    expect(change).toHaveBeenCalledTimes(1);
  });

  it('provides abort, timeout, error, and disposal lifecycle for Worker clients', async () => {
    const postMessage = jest.fn();
    const terminate = jest.fn();
    const worker = { postMessage, terminate, onmessage: null, onerror: null } as unknown as MoleculeWorkerLike;
    const client = createMoleculeWorkerClient(worker, 5);
    const request = client.request({ type: 'validate', molecule: { atoms: [], bonds: [] } });
    const message = postMessage.mock.calls[0][0] as { id: string };
    worker.onmessage!({ data: { id: message.id, ok: true, type: 'validate', value: '[]' } } as MessageEvent);
    await expect(request).resolves.toBe('[]');

    const controller = new AbortController();
    const aborted = client.request({ type: 'validate', molecule: { atoms: [], bonds: [] } }, controller.signal);
    controller.abort();
    await expect(aborted).rejects.toThrow('aborted');
    await expect(client.request({ type: 'validate', molecule: { atoms: [], bonds: [] } })).rejects.toThrow('timed out');
    client.dispose();
    expect(terminate).toHaveBeenCalledTimes(1);
    await expect(client.request({ type: 'validate', molecule: { atoms: [], bonds: [] } })).rejects.toThrow('disposed');
  });

  it('cleans up a request when the Worker rejects postMessage', async () => {
    const terminate = jest.fn();
    const worker = { postMessage: jest.fn(() => { throw new Error('post failed'); }), terminate, onmessage: null, onerror: null } as unknown as MoleculeWorkerLike;
    const client = createMoleculeWorkerClient(worker, 50);
    await expect(client.request({ type: 'validate', molecule: { atoms: [], bonds: [] } })).rejects.toThrow('post failed');
    expect(terminate).not.toHaveBeenCalled();
    client.dispose();
    expect(terminate).toHaveBeenCalledTimes(1);
  });

  it('installs the request-ID protocol in a real Worker-shaped scope', () => {
    const scope = { onmessage: null, postMessage: jest.fn() };
    installMoleculeWorker(scope);
    scope.onmessage!({ data: { id: 'm1', type: 'validate', molecule: { atoms: [], bonds: [] } } } as MessageEvent);
    expect(scope.postMessage).toHaveBeenCalledWith({ id: 'm1', ok: true, type: 'validate', value: '[]' });
  });
});
