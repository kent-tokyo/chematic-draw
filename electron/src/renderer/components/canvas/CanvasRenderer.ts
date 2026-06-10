import { MoleculeDto, AtomDto, BondDto } from '../../store/types';
import { CanvasState } from '../../store/types';
import { calculateArrowPath, getArrowHeadPoints, distanceToCurve, CanvasState as ArrowCanvasState } from '../../lib/arrowGeometry';
import { MechanismArrow } from '../../store/types';

export interface RenderOptions {
  theme: 'dark' | 'light';
  hoverAtomId?: number | null;
  hoverBondId?: number | null;
  selectedAtomIds?: number[];
  selectedBondIds?: number[];
  bondDragFrom?: number | null;
  bondDragPos?: { x: number; y: number } | null;
}

const ATOM_RADIUS = 8;
const BOND_WIDTH = 2;
const GRID_SIZE = 40;

const COLORS = {
  dark: {
    bg: '#1e1e1e',
    grid: '#3a3a3a',
    bond: '#e0e0e0',
    atom: '#ffffff',
    atomLabel: '#000000',
    accent: '#4d8dff',
    selected: '#ffaa00',
    snap: '#00d4aa',
  },
  light: {
    bg: '#ffffff',
    grid: '#e0e0e0',
    bond: '#333333',
    atom: '#ffffff',
    atomLabel: '#000000',
    accent: '#2f6fe8',
    selected: '#ff8800',
    snap: '#00a88c',
  },
};

export class CanvasRenderer {
  constructor(private ctx: CanvasRenderingContext2D, private width: number, private height: number) {}

  clear(theme: 'dark' | 'light') {
    const colors = COLORS[theme];
    this.ctx.fillStyle = colors.bg;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  drawGrid(state: CanvasState, theme: 'dark' | 'light') {
    const colors = COLORS[theme];
    const gridSize = GRID_SIZE * state.zoom;

    if (gridSize < 8) return; // Hide when too small

    this.ctx.strokeStyle = colors.grid;
    this.ctx.lineWidth = 0.5;

    const startX = Math.floor(-state.offset.x / gridSize) * gridSize;
    const startY = Math.floor(-state.offset.y / gridSize) * gridSize;

    for (let x = startX; x < this.width; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x + state.offset.x, -state.offset.y);
      this.ctx.lineTo(x + state.offset.x, this.height - state.offset.y);
      this.ctx.stroke();
    }

    for (let y = startY; y < this.height; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(-state.offset.x, y + state.offset.y);
      this.ctx.lineTo(this.width - state.offset.x, y + state.offset.y);
      this.ctx.stroke();
    }
  }

  drawMolecule(
    molecule: MoleculeDto,
    state: CanvasState,
    options: RenderOptions
  ) {
    const colors = COLORS[options.theme];

    // Draw bonds first (behind atoms)
    this.ctx.strokeStyle = colors.bond;
    this.ctx.lineWidth = BOND_WIDTH;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    for (const bond of molecule.bonds) {
      const from = molecule.atoms.find((a) => a.id === bond.from);
      const to = molecule.atoms.find((a) => a.id === bond.to);
      if (!from || !to) continue;

      const isSelected = options.selectedBondIds?.includes(bond.id) ?? false;
      const isHover = bond.id === options.hoverBondId;

      if (isSelected) this.ctx.strokeStyle = colors.selected;
      else if (isHover) this.ctx.strokeStyle = colors.accent;
      else this.ctx.strokeStyle = colors.bond;

      this.drawBond(from, to, bond, state);
    }

    // Draw ghost bond if dragging
    if (options.bondDragFrom !== null && options.bondDragPos) {
      const from = molecule.atoms.find((a) => a.id === options.bondDragFrom);
      if (from) {
        this.ctx.strokeStyle = colors.accent;
        this.ctx.globalAlpha = 0.6;
        this.ctx.beginPath();
        this.ctx.moveTo(from.x * state.zoom + state.offset.x, from.y * state.zoom + state.offset.y);
        this.ctx.lineTo(options.bondDragPos.x, options.bondDragPos.y);
        this.ctx.stroke();
        this.ctx.globalAlpha = 1.0;
      }
    }

    // Draw atoms
    for (const atom of molecule.atoms) {
      const isSelected = options.selectedAtomIds?.includes(atom.id) ?? false;
      const isHover = atom.id === options.hoverAtomId;

      this.drawAtom(atom, state, {
        theme: options.theme,
        selected: isSelected,
        hover: isHover,
      });
    }
  }

  private drawBond(from: AtomDto, to: AtomDto, bond: BondDto, state: CanvasState) {
    const x1 = from.x * state.zoom + state.offset.x;
    const y1 = from.y * state.zoom + state.offset.y;
    const x2 = to.x * state.zoom + state.offset.x;
    const y2 = to.y * state.zoom + state.offset.y;

    const order = bond.order;
    const stereo = bond.stereo;

    if (order === 1) {
      // Single bond
      this.ctx.beginPath();
      this.ctx.moveTo(x1, y1);
      this.ctx.lineTo(x2, y2);
      this.ctx.stroke();

      // Draw wedge/dash if stereo
      if (stereo === 1) {
        this.drawWedgeUp(x1, y1, x2, y2);
      } else if (stereo === 2) {
        this.drawWedgeDown(x1, y1, x2, y2);
      }
    } else if (order === 2) {
      // Double bond
      this.drawDoubleBond(x1, y1, x2, y2);
    } else if (order === 3) {
      // Triple bond
      this.drawTripleBond(x1, y1, x2, y2);
    } else if (order === 4) {
      // Aromatic
      this.drawAromaticBond(x1, y1, x2, y2);
    }
  }

  private drawWedgeUp(x1: number, y1: number, x2: number, y2: number) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    const px = (dy / len) * 5;
    const py = -(dx / len) * 5;

    this.ctx.fillStyle = this.ctx.strokeStyle;
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2 + px, y2 + py);
    this.ctx.lineTo(x2 - px, y2 - py);
    this.ctx.closePath();
    this.ctx.fill();
  }

  private drawWedgeDown(x1: number, y1: number, x2: number, y2: number) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    const px = (dy / len) * 4;
    const py = -(dx / len) * 4;

    this.ctx.setLineDash([4, 4]);
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
  }

  private drawDoubleBond(x1: number, y1: number, x2: number, y2: number) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    const offset = 3;
    const px = (dy / len) * offset;
    const py = -(dx / len) * offset;

    this.ctx.beginPath();
    this.ctx.moveTo(x1 + px, y1 + py);
    this.ctx.lineTo(x2 + px, y2 + py);
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.moveTo(x1 - px, y1 - py);
    this.ctx.lineTo(x2 - px, y2 - py);
    this.ctx.stroke();
  }

  private drawTripleBond(x1: number, y1: number, x2: number, y2: number) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    const offset = 4;
    const px = (dy / len) * offset;
    const py = -(dx / len) * offset;

    // Middle line
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.stroke();

    // Upper line
    this.ctx.beginPath();
    this.ctx.moveTo(x1 + px, y1 + py);
    this.ctx.lineTo(x2 + px, y2 + py);
    this.ctx.stroke();

    // Lower line
    this.ctx.beginPath();
    this.ctx.moveTo(x1 - px, y1 - py);
    this.ctx.lineTo(x2 - px, y2 - py);
    this.ctx.stroke();
  }

  private drawAromaticBond(x1: number, y1: number, x2: number, y2: number) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    const offset = 3;
    const px = (dy / len) * offset;
    const py = -(dx / len) * offset;

    // Solid line
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.stroke();

    // Dashed line
    this.ctx.setLineDash([3, 3]);
    this.ctx.beginPath();
    this.ctx.moveTo(x1 + px, y1 + py);
    this.ctx.lineTo(x2 + px, y2 + py);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
  }

  private drawAtom(
    atom: AtomDto,
    state: CanvasState,
    options: { theme: 'dark' | 'light'; selected: boolean; hover: boolean }
  ) {
    const colors = COLORS[options.theme];
    const x = atom.x * state.zoom + state.offset.x;
    const y = atom.y * state.zoom + state.offset.y;
    const radius = ATOM_RADIUS * (options.selected ? 1.5 : 1);

    // Draw atom circle
    this.ctx.fillStyle = options.selected ? colors.selected : colors.atom;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fill();

    // Draw border if hover or selected
    if (options.hover || options.selected) {
      this.ctx.strokeStyle = colors.accent;
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
    }

    // Draw element label
    this.ctx.fillStyle = colors.atomLabel;
    this.ctx.font = `bold ${12 * state.zoom}px Arial`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(atom.element, x, y);

    // Draw charge if present
    if (atom.charge !== 0) {
      const chargeStr = atom.charge > 0 ? `+${atom.charge}` : `${atom.charge}`;
      this.ctx.font = `${10 * state.zoom}px Arial`;
      this.ctx.fillText(chargeStr, x + radius + 5, y - radius - 5);
    }
  }

  drawMechanismArrows(
    molecule: MoleculeDto,
    arrows: MechanismArrow[],
    state: ArrowCanvasState,
    options: RenderOptions
  ) {
    const colors = COLORS[options.theme];

    for (const arrow of arrows) {
      const path = calculateArrowPath(molecule, arrow, state);
      if (!path) continue;

      const isSelected = (options as any).selectedArrowId === arrow.id;
      const isHover = (options as any).hoverArrowId === arrow.id;

      let arrowColor = colors.bond;
      if (arrow.type === 'forward') {
        arrowColor = '#4d8dff';
      } else if (arrow.type === 'retro') {
        arrowColor = '#ff6b6b';
      } else if (arrow.type === 'resonance') {
        arrowColor = '#51cf66';
      }

      if (isSelected) arrowColor = colors.selected;
      else if (isHover) arrowColor = colors.accent;

      this.ctx.strokeStyle = arrowColor;
      this.ctx.lineWidth = 2.0;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';

      // Main arrow line
      this.ctx.beginPath();
      this.ctx.moveTo(path.startX, path.startY);
      this.ctx.quadraticCurveTo(path.controlX, path.controlY, path.endX, path.endY);
      this.ctx.stroke();

      const headPoints = getArrowHeadPoints(path.endX, path.endY, path.endAngle);
      this.ctx.fillStyle = arrowColor;
      this.ctx.beginPath();
      this.ctx.moveTo(headPoints.x1, headPoints.y1);
      this.ctx.lineTo(headPoints.x2, headPoints.y2);
      this.ctx.lineTo(headPoints.x3, headPoints.y3);
      this.ctx.closePath();
      this.ctx.fill();

      if (arrow.type === 'retro') {
        this.ctx.strokeStyle = arrowColor;
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 3]);
        this.ctx.beginPath();
        this.ctx.moveTo(path.startX, path.startY);
        this.ctx.quadraticCurveTo(path.controlX, path.controlY, path.endX, path.endY);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
      }

      if (arrow.type === 'resonance') {
        this.ctx.strokeStyle = arrowColor;
        this.ctx.lineWidth = 1.5;
        this.ctx.setLineDash([3, 3]);
        this.ctx.beginPath();
        this.ctx.moveTo(path.startX, path.startY);
        this.ctx.quadraticCurveTo(path.controlX, path.controlY, path.endX, path.endY);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
      }
    }
  }
}
