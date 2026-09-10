import { SchematicMoleculeElement, defineSchematicMoleculeElement, renderMoleculeSvg, serializeMolecule } from '../../../packages/chematic-web/src/index';
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

  it('provides deterministic dependency-free serialization and SVG rendering', () => {
    const molecule = { atoms: [{ id: 1, element: 'C', x: 0, y: 0, charge: 0, atom_map: 0 }], bonds: [] };
    expect(serializeMolecule(molecule)).toBe(JSON.stringify(molecule));
    expect(renderMoleculeSvg(molecule)).toBe(renderMoleculeSvg(molecule));
  });

  it('rejects dangling bond endpoints before rendering', () => {
    expect(() => serializeMolecule({ atoms: [{ id: 1, element: 'C', x: 0, y: 0, charge: 0, atom_map: 0 }], bonds: [{ id: 1, from: 1, to: 9, order: 1, stereo: 0 }] })).toThrow(/endpoints/);
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
    expect(element.undo()?.atoms).toEqual([]);
    expect(element.canRedo).toBe(true);
    expect((change.mock.calls[1][0] as CustomEvent).detail.direction).toBe('undo');
    expect(element.redo()?.atoms).toHaveLength(1);
    expect((change.mock.calls[2][0] as CustomEvent).detail.direction).toBe('redo');
    element.setAttribute('readonly', '');
    expect(() => element.applyEdit({ type: 'remove-atom', atomId: 1 })).toThrow(/read-only/);
    element.removeAttribute('readonly');
    element.dispose();
    expect(element.innerHTML).toBe('');
    expect(() => element.applyEdit({ type: 'remove-atom', atomId: 1 })).toThrow(/disposed/);
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

  it('reports invalid editor edits without mutating the current molecule', () => {
    const element = document.createElement('chematic-molecule-editor') as SchematicMoleculeEditorElement;
    element.molecule = { atoms: [], bonds: [] };
    const error = jest.fn();
    element.addEventListener('schematic-error', error);
    expect(() => element.applyEdit({ type: 'remove-atom', atomId: 9 })).toThrow(/does not exist/);
    expect(error).toHaveBeenCalledTimes(1);
    expect(element.molecule.atoms).toEqual([]);
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
