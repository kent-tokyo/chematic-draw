import { cloneMolecule, finiteMolecule, serializeMolecule, validateEmbeddedMolecule } from './moleculeValidation';
import { summarizeEmbeddedMolecule, type EmbeddedMoleculeSummary } from './moleculeSummary';
import { renderMoleculeSvg } from './moleculeSvg';
import type { Molecule } from '@chematic/contract';

export { renderMoleculeSvg, serializeMolecule, summarizeEmbeddedMolecule, validateEmbeddedMolecule };
export type { EmbeddedMoleculeSummary };

/** A dependency-free, read-only molecule surface for HTML embeds. */
export class SchematicMoleculeElement extends (typeof HTMLElement === 'undefined' ? class {} as typeof HTMLElement : HTMLElement) {
  static observedAttributes = ['value', 'readonly'];
  private current: Molecule = { atoms: [], bonds: [] };

  get molecule(): Molecule { return cloneMolecule(this.current); }
  set molecule(value: Molecule) { this.current = finiteMolecule(value); this.render(); }
  serialize(): string { return serializeMolecule(this.current); }
  validate(): string[] { return validateEmbeddedMolecule(this.current); }

  connectedCallback(): void {
    this.setAttribute('role', 'img');
    this.setAttribute('aria-label', this.getAttribute('aria-label') ?? 'Molecule structure');
    this.readAttributeValue();
    this.render();
  }

  attributeChangedCallback(name: string): void {
    if (name === 'value' && this.isConnected) { this.readAttributeValue(); this.render(); }
  }

  private readAttributeValue(): void {
    const raw = this.getAttribute('value');
    if (!raw) return;
    try { this.current = finiteMolecule(JSON.parse(raw)); }
    catch (error) { this.dispatchEvent(new CustomEvent('schematic-error', { detail: error, bubbles: true, composed: true })); }
  }

  private render(): void { this.innerHTML = renderMoleculeSvg(this.current); }
}

export function defineSchematicMoleculeElement(): void {
  if (!customElements.get('chematic-molecule')) customElements.define('chematic-molecule', SchematicMoleculeElement);
}

if (typeof customElements !== 'undefined') defineSchematicMoleculeElement();
