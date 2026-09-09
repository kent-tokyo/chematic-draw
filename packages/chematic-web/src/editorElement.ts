import type { Molecule } from '@chematic/contract';
import { applyMoleculeEdit, type MoleculeEdit } from './editor';
import { renderMoleculeSvg, serializeMolecule } from './index';

const HTMLElementBase: typeof HTMLElement = typeof HTMLElement === 'undefined' ? class {} as typeof HTMLElement : HTMLElement;

export interface MoleculeChangeDetail {
  molecule: Molecule;
  edit: MoleculeEdit;
}

/**
 * An explicitly opt-in, framework-free editor surface. The host owns the
 * controls and calls applyEdit; the element only validates, renders, and
 * emits the resulting immutable molecule.
 */
export class SchematicMoleculeEditorElement extends HTMLElementBase {
  static observedAttributes = ['value', 'readonly'];
  private current: Molecule = { atoms: [], bonds: [] };

  get molecule(): Molecule { return JSON.parse(serializeMolecule(this.current)) as Molecule; }

  set molecule(value: Molecule) {
    this.current = JSON.parse(serializeMolecule(value)) as Molecule;
    this.render();
  }

  connectedCallback(): void {
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
    if (this.hasAttribute('readonly')) throw new Error('schematic-molecule-editor is read-only');
    try {
      const next = applyMoleculeEdit(this.current, edit);
      this.current = next;
      this.render();
      this.dispatchEvent(new CustomEvent<MoleculeChangeDetail>('molecule-change', {
        detail: { molecule: this.molecule, edit },
      }));
      return this.molecule;
    } catch (error) {
      this.dispatchEvent(new CustomEvent('schematic-error', { detail: error }));
      throw error;
    }
  }

  private readAttributeValue(): void {
    const raw = this.getAttribute('value');
    if (!raw) return;
    try {
      this.current = JSON.parse(serializeMolecule(JSON.parse(raw) as Molecule)) as Molecule;
    } catch (error) {
      this.dispatchEvent(new CustomEvent('schematic-error', { detail: error }));
    }
  }

  private render(): void {
    this.innerHTML = renderMoleculeSvg(this.current);
  }
}

export function defineSchematicMoleculeEditorElement(): void {
  if (!customElements.get('chematic-molecule-editor')) customElements.define('chematic-molecule-editor', SchematicMoleculeEditorElement);
}
