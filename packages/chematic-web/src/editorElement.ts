import { validateMolecule, type Molecule } from '@chematic/contract';
import { applyMoleculeEdit, type MoleculeEdit } from './editor';
import { renderMoleculeSvg, serializeMolecule } from './index';

const HTMLElementBase: typeof HTMLElement = typeof HTMLElement === 'undefined' ? class {} as typeof HTMLElement : HTMLElement;

export interface MoleculeChangeDetail {
  molecule: Molecule;
  edit: MoleculeEdit | null;
  edits?: MoleculeEdit[];
  direction: 'edit' | 'undo' | 'redo';
}

export const DEFAULT_EDITOR_HISTORY_LIMIT = 100;
export const MAX_EDITOR_EDIT_BATCH = 256;
type PointerTool = 'draw' | 'atom' | 'bond' | 'erase';

/**
 * An explicitly opt-in, framework-free editor surface. The host owns the
 * controls and calls applyEdit; the element only validates, renders, and
 * emits the resulting immutable molecule.
 */
export class SchematicMoleculeEditorElement extends HTMLElementBase {
  static observedAttributes = ['value', 'readonly', 'interaction', 'keyboard', 'tool', 'atom-element', 'bond-order'];
  private current: Molecule = { atoms: [], bonds: [] };
  private history: Molecule[] = [this.current];
  private historyIndex = 0;
  private disposed = false;
  private pointerStart: { atomId: number | null; x: number; y: number } | null = null;
  private ownsKeyboardTabIndex = false;

  get molecule(): Molecule { return JSON.parse(serializeMolecule(this.current)) as Molecule; }

  /** Return a detached JSON payload suitable for host persistence or transport. */
  serialize(): string { this.ensureActive(); return serializeMolecule(this.current); }

  /** Re-run the public contract validation before a host commits an export. */
  validate(): string[] { this.ensureActive(); return validateMolecule(this.current); }

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
    this.addEventListener('pointerdown', this.handlePointerDown);
    this.addEventListener('pointerup', this.handlePointerUp);
    this.addEventListener('keydown', this.handleKeyDown);
    this.syncKeyboardSemantics();
    this.readAttributeValue();
    this.render();
  }

  disconnectedCallback(): void {
    this.removeEventListener('pointerdown', this.handlePointerDown);
    this.removeEventListener('pointerup', this.handlePointerUp);
    this.removeEventListener('keydown', this.handleKeyDown);
    this.pointerStart = null;
  }

  attributeChangedCallback(name: string): void {
    if (name === 'value' && this.isConnected) {
      this.readAttributeValue();
      this.render();
    }
    if ((name === 'keyboard' || name === 'readonly') && this.isConnected) this.syncKeyboardSemantics();
  }

  /** Apply one validated edit and notify the host of the new molecule. */
  applyEdit(edit: MoleculeEdit): Molecule {
    return this.applyEdits([edit]);
  }

  /**
   * Apply a bounded edit batch atomically. Every edit is validated against the
   * result of the previous one, but history and the host event are committed
   * only after the whole batch succeeds.
   */
  applyEdits(edits: MoleculeEdit[]): Molecule {
    this.ensureActive();
    try {
      if (this.hasAttribute('readonly')) throw new Error('schematic-molecule-editor is read-only');
      if (!Array.isArray(edits) || edits.length === 0) throw new Error('Molecule edit batch must contain at least one edit');
      if (edits.length > MAX_EDITOR_EDIT_BATCH) throw new RangeError(`Molecule edit batch must contain at most ${MAX_EDITOR_EDIT_BATCH} edits`);
      const next = edits.reduce((current, edit) => applyMoleculeEdit(current, edit), this.current);
      this.current = next;
      this.history = [...this.history.slice(0, this.historyIndex + 1), next].slice(-DEFAULT_EDITOR_HISTORY_LIMIT);
      this.historyIndex = this.history.length - 1;
      this.render();
      this.dispatchEvent(new CustomEvent<MoleculeChangeDetail>('molecule-change', {
        detail: { molecule: this.molecule, edit: edits.length === 1 ? edits[0] : null, edits: [...edits], direction: 'edit' },
        bubbles: true,
        composed: true,
      }));
      return this.molecule;
    } catch (error) {
      this.dispatchEvent(new CustomEvent('schematic-error', { detail: error, bubbles: true, composed: true }));
      throw error;
    }
  }

  get canUndo(): boolean { return !this.disposed && this.historyIndex > 0; }

  get canRedo(): boolean { return !this.disposed && this.historyIndex < this.history.length - 1; }

  undo(): Molecule | null { return this.moveHistory(-1, 'undo'); }

  redo(): Molecule | null { return this.moveHistory(1, 'redo'); }

  dispose(): void {
    this.disposed = true;
    this.pointerStart = null;
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
      bubbles: true,
      composed: true,
    }));
    return this.molecule;
  }

  private handleKeyDown = (event: Event): void => {
    if (this.disposed || this.hasAttribute('readonly') || this.getAttribute('keyboard') !== 'edit') return;
    const keyboard = event as KeyboardEvent;
    if (keyboard.altKey || (!keyboard.ctrlKey && !keyboard.metaKey)) return;
    const key = keyboard.key.toLowerCase();
    const isUndo = key === 'z' && !keyboard.shiftKey;
    const isRedo = (key === 'z' && keyboard.shiftKey) || key === 'y';
    if ((isUndo && !this.canUndo) || (isRedo && !this.canRedo) || (!isUndo && !isRedo)) return;
    event.preventDefault();
    if (isUndo) this.undo();
    else this.redo();
  };

  private syncKeyboardSemantics(): void {
    const enabled = this.getAttribute('keyboard') === 'edit';
    this.setAttribute('aria-readonly', this.hasAttribute('readonly') ? 'true' : 'false');
    if (enabled) {
      if (!this.hasAttribute('tabindex')) {
        this.setAttribute('tabindex', '0');
        this.ownsKeyboardTabIndex = true;
      }
      this.setAttribute('aria-keyshortcuts', 'Control+Z Meta+Z Control+Shift+Z Meta+Shift+Z Control+Y Meta+Y');
    } else {
      if (this.ownsKeyboardTabIndex) this.removeAttribute('tabindex');
      this.ownsKeyboardTabIndex = false;
      this.removeAttribute('aria-keyshortcuts');
    }
  }

  private handlePointerDown = (event: Event): void => {
    if (this.disposed || this.hasAttribute('readonly') || this.getAttribute('interaction') !== 'draw') return;
    const pointer = event as PointerEvent;
    const point = this.canvasPoint(pointer.clientX, pointer.clientY);
    if (!point) return;
    const atom = (event.target as Element | null)?.closest?.('[data-atom-id]');
    this.pointerStart = { atomId: atom ? Number(atom.getAttribute('data-atom-id')) : null, ...point };
  };

  private handlePointerUp = (event: Event): void => {
    const start = this.pointerStart;
    this.pointerStart = null;
    if (!start || this.disposed || this.hasAttribute('readonly') || this.getAttribute('interaction') !== 'draw') return;
    const pointer = event as PointerEvent;
    const point = this.canvasPoint(pointer.clientX, pointer.clientY);
    if (!point) return;
    const atom = (event.target as Element | null)?.closest?.('[data-atom-id]');
    const endAtomId = atom ? Number(atom.getAttribute('data-atom-id')) : null;
    try {
      const tool = this.pointerTool();
      if (tool === 'erase') {
        if (endAtomId !== null) this.applyEdit({ type: 'remove-atom', atomId: endAtomId });
      } else if (tool === 'atom') {
        if (endAtomId !== null) this.applyEdit({ type: 'update-atom', atomId: endAtomId, updates: { element: this.atomElement() } });
        else if (start.atomId === null) this.addPointerAtom(point.x, point.y);
      } else if (tool === 'bond') {
        if (start.atomId !== null && endAtomId !== null && start.atomId !== endAtomId) this.addPointerBond(start.atomId, endAtomId);
      } else if (start.atomId !== null && endAtomId !== null && start.atomId !== endAtomId) {
        this.addPointerBond(start.atomId, endAtomId);
      } else if (start.atomId === null && endAtomId === null) {
        this.addPointerAtom(point.x, point.y);
      }
    } catch {
      // applyEdit already emits the structured schematic-error event.
    }
  };

  private pointerTool(): PointerTool {
    const value = this.getAttribute('tool');
    return value === 'atom' || value === 'bond' || value === 'erase' ? value : 'draw';
  }

  private atomElement(): string {
    const value = this.getAttribute('atom-element')?.trim();
    return value && /^[A-Z][a-z]?$/.test(value) ? value : 'C';
  }

  private bondOrder(): number {
    const value = Number(this.getAttribute('bond-order') ?? '1');
    return Number.isInteger(value) && value >= 1 && value <= 4 ? value : 1;
  }

  private addPointerAtom(x: number, y: number): void {
    const atomId = this.current.atoms.reduce((maximum, candidate) => Math.max(maximum, candidate.id), 0) + 1;
    this.applyEdit({ type: 'add-atom', atom: { id: atomId, element: this.atomElement(), x, y, charge: 0, atom_map: 0 } });
  }

  private addPointerBond(from: number, to: number): void {
    const bondId = this.current.bonds.reduce((maximum, bond) => Math.max(maximum, bond.id), 0) + 1;
    this.applyEdit({ type: 'add-bond', bond: { id: bondId, from, to, order: this.bondOrder(), stereo: 0 } });
  }

  private canvasPoint(clientX: number, clientY: number): { x: number; y: number } | null {
    const svg = this.querySelector('svg');
    if (!svg || !Number.isFinite(clientX) || !Number.isFinite(clientY)) return null;
    const rect = svg.getBoundingClientRect();
    const viewBox = svg.getAttribute('viewBox')?.trim().split(/\s+/).map(Number);
    if (!viewBox || viewBox.length !== 4 || !viewBox.every(Number.isFinite) || rect.width <= 0 || rect.height <= 0) return null;
    return { x: viewBox[0] + ((clientX - rect.left) / rect.width) * viewBox[2], y: viewBox[1] + ((clientY - rect.top) / rect.height) * viewBox[3] };
  }
}

export function defineSchematicMoleculeEditorElement(): void {
  if (!customElements.get('chematic-molecule-editor')) customElements.define('chematic-molecule-editor', SchematicMoleculeEditorElement);
}
