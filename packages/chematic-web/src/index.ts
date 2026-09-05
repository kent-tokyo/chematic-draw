import type { Molecule, MoleculeAtom, MoleculeBond } from '../../chematic-contract/src/index';

const ELEMENT_COLORS: Record<string, string> = { C: '#e5e7eb', N: '#60a5fa', O: '#f87171', S: '#facc15', P: '#fb923c' };

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[character]!));
}

function cloneMolecule(molecule: Molecule): Molecule {
  return {
    atoms: molecule.atoms.map((atom) => ({ ...atom })),
    bonds: molecule.bonds.map((bond) => ({ ...bond })),
  };
}

function finiteMolecule(value: unknown): Molecule {
  if (!value || typeof value !== 'object' || !Array.isArray((value as Molecule).atoms) || !Array.isArray((value as Molecule).bonds)) {
    throw new TypeError('schematic-molecule expects a molecule with atoms and bonds arrays');
  }
  const molecule = value as Molecule;
  for (const atom of molecule.atoms) {
    if (!Number.isFinite(atom.x) || !Number.isFinite(atom.y) || !Number.isInteger(atom.id) || typeof atom.element !== 'string') throw new TypeError(`Invalid atom: ${atom?.id ?? 'unknown'}`);
  }
  for (const bond of molecule.bonds) {
    if (!Number.isInteger(bond.id) || !Number.isInteger(bond.from) || !Number.isInteger(bond.to) || !Number.isFinite(bond.order)) throw new TypeError(`Invalid bond: ${bond?.id ?? 'unknown'}`);
  }
  return cloneMolecule(molecule);
}

function bounds(molecule: Molecule): { minX: number; minY: number; width: number; height: number } {
  const atoms = molecule.atoms;
  if (!atoms.length) return { minX: 0, minY: 0, width: 120, height: 80 };
  const xs = atoms.map((atom) => atom.x), ys = atoms.map((atom) => atom.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  return { minX: minX - 32, minY: minY - 32, width: Math.max(64, maxX - minX + 64), height: Math.max(64, maxY - minY + 64) };
}

/** A dependency-free, read-only molecule surface for HTML embeds. */
export class SchematicMoleculeElement extends HTMLElement {
  static observedAttributes = ['value', 'readonly'];
  private current: Molecule = { atoms: [], bonds: [] };

  get molecule(): Molecule { return cloneMolecule(this.current); }
  set molecule(value: Molecule) { this.current = finiteMolecule(value); this.render(); }

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
    try { this.current = finiteMolecule(JSON.parse(raw)); } catch (error) { this.dispatchEvent(new CustomEvent('schematic-error', { detail: error })); }
  }

  private render(): void {
    const box = bounds(this.current);
    const atoms = new Map(this.current.atoms.map((atom) => [atom.id, atom]));
    const bondSvg = this.current.bonds.map((bond) => {
      const from = atoms.get(bond.from), to = atoms.get(bond.to);
      if (!from || !to) return '';
      const width = Math.max(1.5, Math.min(4, bond.order));
      return `<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" stroke="currentColor" stroke-width="${width}" stroke-linecap="round" />`;
    }).join('');
    const atomSvg = this.current.atoms.map((atom: MoleculeAtom) => {
      const label = atom.display_label ?? (atom.element === 'C' ? '' : atom.element);
      return `<g data-atom-id="${atom.id}"><circle cx="${atom.x}" cy="${atom.y}" r="10" fill="${ELEMENT_COLORS[atom.element] ?? '#d1d5db'}" stroke="#111827" stroke-width="1" /><text x="${atom.x}" y="${atom.y + 4}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="10" fill="#111827">${escapeXml(label)}</text></g>`;
    }).join('');
    this.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box.minX} ${box.minY} ${box.width} ${box.height}" width="${box.width}" height="${box.height}" focusable="false" aria-hidden="true"><g>${bondSvg}${atomSvg}</g></svg>`;
  }
}

export function defineSchematicMoleculeElement(): void {
  if (!customElements.get('chematic-molecule')) customElements.define('chematic-molecule', SchematicMoleculeElement);
}

if (typeof customElements !== 'undefined') defineSchematicMoleculeElement();
