import type { Molecule } from '@chematic/contract';
import { applyMoleculeEdit, type MoleculeEdit } from './editor';
import { renderMoleculeSvg, serializeMolecule } from './index';

const HTMLElementBase: typeof HTMLElement = typeof HTMLElement === 'undefined' ? class {} as typeof HTMLElement : HTMLElement;

export interface MoleculeChangeDetail {
  molecule: Molecule;
  edit: MoleculeEdit | null;
  direction: 'edit' | 'undo' | 'redo';
}

export const DEFAULT_EDITOR_HISTORY_LIMIT = 100;

/**
 * An explicitly opt-in, framework-free editor surface. The host owns the
 * controls and calls applyEdit; the element only validates, renders, and
 * emits the resulting immutable molecule.
 */
export class SchematicMoleculeEditorElement extends HTMLElementBase {
  static observedAttributes = ['value', 'readonly'];
  private current: Molecule = { atoms: [], bonds: [] };
  private history: Molecule[] = [this.current];
  private historyIndex = 0;
  private disposed = false;

  get molecule(): Molecule { return JSON.parse(serializeMolecule(this.current)) as Molecule; }

  set molecule(value: Molecule) {
    this.ensureActive();
    this.current = JSON.parse(serializeMolecule(value)) as Molecule;
    this.resetHistory();
    this.render();
  }

  connectedCallback(): void {
    if (this.disposed) return;
    this.setAttribute('role', 'application');
    this.setAttribute('aria-label', this.getAttribute('aria-label') ?? 'Molecule editor');
    this.readAttributeValue();
    this.render();
  }

  attributeChangedCallback(name: string): void {
    if (name === 'value' && this.isConnected) {
      this.readAttributeValue();
      this.render();
    }
  }

  /** Apply one validated edit and notify the host of the new molecule. */
  applyEdit(edit: MoleculeEdit): Molecule {
    this.ensureActive();
    if (this.hasAttribute('readonly')) throw new Error('schematic-molecule-editor is read-only');
    try {
      const next = applyMoleculeEdit(this.current, edit);
      this.current = next;
      this.history = [...this.history.slice(0, this.historyIndex + 1), next].slice(-DEFAULT_EDITOR_HISTORY_LIMIT);
      this.historyIndex = this.history.length - 1;
      this.render();
      this.dispatchEvent(new CustomEvent<MoleculeChangeDetail>('molecule-change', {
        detail: { molecule: this.molecule, edit, direction: 'edit' },
      }));
      return this.molecule;
    } catch (error) {
      this.dispatchEvent(new CustomEvent('schematic-error', { detail: error }));
      throw error;
    }
  }

  get canUndo(): boolean { return !this.disposed && this.historyIndex > 0; }

  get canRedo(): boolean { return !this.disposed && this.historyIndex < this.history.length - 1; }

  undo(): Molecule | null { return this.moveHistory(-1, 'undo'); }

  redo(): Molecule | null { return this.moveHistory(1, 'redo'); }

  dispose(): void {
    this.disposed = true;
    this.history = [];
    this.historyIndex = -1;
    this.innerHTML = '';
  }

  private readAttributeValue(): void {
    const raw = this.getAttribute('value');
    if (!raw) return;
    try {
      this.current = JSON.parse(serializeMolecule(JSON.parse(raw) as Molecule)) as Molecule;
      this.resetHistory();
    } catch (error) {
      this.dispatchEvent(new CustomEvent('schematic-error', { detail: error }));
    }
  }

  private render(): void {
    if (this.disposed) return;
    this.innerHTML = renderMoleculeSvg(this.current);
  }

  private resetHistory(): void {
    this.history = [this.current];
    this.historyIndex = 0;
  }

  private ensureActive(): void {
    if (this.disposed) throw new Error('schematic-molecule-editor is disposed');
  }

  private moveHistory(offset: -1 | 1, direction: 'undo' | 'redo'): Molecule | null {
    if (!this.canUndo && offset < 0 || !this.canRedo && offset > 0) return null;
    this.historyIndex += offset;
    this.current = this.history[this.historyIndex];
    this.render();
    this.dispatchEvent(new CustomEvent<MoleculeChangeDetail>('molecule-change', {
      detail: { molecule: this.molecule, edit: null, direction },
    }));
    return this.molecule;
  }
}

export function defineSchematicMoleculeEditorElement(): void {
  if (!customElements.get('chematic-molecule-editor')) customElements.define('chematic-molecule-editor', SchematicMoleculeEditorElement);
}
