import { MoleculeDto, AtomDto, BondDto } from '../../store/types';
import { CanvasState } from '../../store/types';
import { calculateArrowPath, getArrowHeadPoints, distanceToCurve, CanvasState as ArrowCanvasState } from '../../lib/arrowGeometry';
import { getLabelPosition, getLabelDimensions } from '../../lib/arrowGeometry';
import { MechanismArrow } from '../../store/types';
import { SchemeLayout, StepBox, StepArrow } from '../../lib/schemeLayout';
import { ReactionSchemeContext, MechanismStep } from '../../store/types';
import { getExternalReagents } from '../../lib/reactionSchemeUtils';

export interface RenderOptions {
  theme: 'dark' | 'light';
  hoverAtomId?: number | null;
  hoverBondId?: number | null;
  selectedAtomIds?: number[];
  selectedBondIds?: number[];
  bondDragFrom?: number | null;
  bondDragPos?: { x: number; y: number } | null;
  selectedArrowId?: string | null;
  hoverArrowId?: string | null;
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

// CPK-inspired per-element fill colors, covering ElementPicker.tsx's
// COMMON_ELEMENTS list. Every unselected atom used to render as a plain
// white circle regardless of element — only the text label distinguished
// C from O from N, which hurts quick visual scanning of a larger
// structure, the way real CPK coloring is meant to help with. Kept to a
// single theme-independent map (real CPK convention doesn't change with
// light/dark mode either) and to light/medium tones so the existing black
// `atomLabel` text stays legible on all of them without a separate
// per-element text-contrast calculation.
const ELEMENT_COLORS: Record<string, string> = {
  H: '#f5f5f5',
  C: '#d8d8d8',
  N: '#8ab4f8',
  O: '#f28b82',
  F: '#a5d6a7',
  P: '#ffab40',
  S: '#ffd54f',
  Cl: '#66bb6a',
  Br: '#c68958',
  I: '#ba68c8',
  B: '#ffccbc',
  Si: '#d7ccc8',
  Se: '#ffb74d',
  Li: '#ce93d8',
  Na: '#ce93d8',
  K: '#ce93d8',
  Ca: '#a5d6a7',
  Fe: '#ff8a65',
  Cu: '#ffb289',
  Zn: '#b0bec5',
};

const STEP_BOX_PADDING = 10;
const STEP_BOX_BORDER_WIDTH = 2;
const STEP_BOX_SELECTED_BORDER_WIDTH = 3;
const STEP_ARROW_WIDTH = 2;
const TEXT_LINE_HEIGHT = 16;

export class CanvasRenderer {
  constructor(private ctx: CanvasRenderingContext2D, private width: number, private height: number) {}

  clear(theme: 'dark' | 'light') {
    const colors = COLORS[theme];
    this.ctx.fillStyle = colors.bg;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  drawGrid(state: Pick<CanvasState, 'offset' | 'zoom'>, theme: 'dark' | 'light') {
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
    state: Pick<CanvasState, 'offset' | 'zoom'>,
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

  private drawBond(from: AtomDto, to: AtomDto, bond: BondDto, state: Pick<CanvasState, 'offset' | 'zoom'>) {
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
    state: Pick<CanvasState, 'offset' | 'zoom'>,
    options: { theme: 'dark' | 'light'; selected: boolean; hover: boolean }
  ) {
    const colors = COLORS[options.theme];
    const x = atom.x * state.zoom + state.offset.x;
    const y = atom.y * state.zoom + state.offset.y;
    const radius = ATOM_RADIUS * (options.selected ? 1.5 : 1);

    // Draw atom circle
    this.ctx.fillStyle = options.selected ? colors.selected : (ELEMENT_COLORS[atom.element] ?? colors.atom);
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fill();

    // Draw border if hover or selected
    if (options.hover || options.selected) {
      this.ctx.strokeStyle = colors.accent;
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
    }

    // Draw element label. `display_label` is the cosmetic, derived form
    // (e.g. "" to suppress a skeletal interior carbon's label entirely) —
    // an explicit "" must be respected as-is, not treated as "no label" and
    // replaced by `element` (which is now always a real symbol like "C",
    // so `?? element` would print "C" on every carbon in the molecule).
    // Only undefined/null (no label info at all) falls back to `element`.
    const label = atom.display_label === undefined || atom.display_label === null
      ? atom.element
      : atom.display_label;
    this.ctx.fillStyle = colors.atomLabel;
    this.ctx.font = `bold ${12 * state.zoom}px Arial`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(label, x, y);

    // Draw charge if present
    if (atom.charge !== 0) {
      const chargeStr = atom.charge > 0 ? `+${atom.charge}` : `${atom.charge}`;
      this.ctx.font = `${10 * state.zoom}px Arial`;
      this.ctx.fillText(chargeStr, x + radius + 5, y - radius - 5);
    }

    // Draw isotope mass number if present, mirroring charge's position on
    // the opposite corner (a true stacked superscript prefix would need
    // per-glyph width measurement; this simplified adjacent-label placement
    // matches what several other 2D editors do for the same reason).
    if (atom.isotope !== undefined && atom.isotope !== null) {
      this.ctx.font = `${10 * state.zoom}px Arial`;
      this.ctx.fillText(`${atom.isotope}`, x - radius - 5, y - radius - 5);
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

      const isSelected = options.selectedArrowId === arrow.id;
      const isHover = options.hoverArrowId === arrow.id;

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

    // Draw arrow labels
    const LABEL_FONT_SIZE = 11;
    const LABEL_PADDING = 4;

    for (const arrow of arrows) {
      if (!arrow.label || arrow.label.trim() === '') continue;

      const path = calculateArrowPath(molecule, arrow, state);
      if (!path) continue;

      const labelPos = getLabelPosition(path, 8);

      // Save canvas state for text rendering
      this.ctx.save();

      // Calculate text metrics
      this.ctx.font = `${LABEL_FONT_SIZE}px sans-serif`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      const textMetrics = this.ctx.measureText(arrow.label);
      const textWidth = textMetrics.width;
      const textHeight = LABEL_FONT_SIZE + 2;

      // Draw background box
      const bgX = labelPos.x - textWidth / 2 - LABEL_PADDING;
      const bgY = labelPos.y - textHeight / 2 - LABEL_PADDING;
      const bgWidth = textWidth + LABEL_PADDING * 2;
      const bgHeight = textHeight + LABEL_PADDING * 2;

      this.ctx.fillStyle = options.theme === 'dark' ? '#2a2a2a' : '#ffffff';
      this.ctx.globalAlpha = 0.95;
      this.ctx.beginPath();
      if (typeof this.ctx.roundRect === 'function') {
        this.ctx.roundRect(bgX, bgY, bgWidth, bgHeight, 3);
      } else {
        this.ctx.rect(bgX, bgY, bgWidth, bgHeight);
      }
      this.ctx.fill();
      this.ctx.globalAlpha = 1.0;

      // Draw border
      this.ctx.strokeStyle = arrow.type === 'forward'
        ? '#4d8dff'
        : arrow.type === 'retro'
        ? '#ff6b6b'
        : '#51cf66';
      this.ctx.lineWidth = 1;
      this.ctx.stroke();

      // Draw text
      this.ctx.fillStyle = options.theme === 'dark' ? '#e8e8e8' : '#333333';
      this.ctx.fillText(arrow.label, labelPos.x, labelPos.y);

      this.ctx.restore();
    }
  }

  /**
   * Draw complete reaction scheme with all steps
   */
  drawReactionScheme(
    scheme: ReactionSchemeContext,
    layout: SchemeLayout,
    options: RenderOptions & { selectedStepIndex?: number; hoveredStepIndex?: number }
  ) {
    const colors = COLORS[options.theme];

    // Draw step arrows first (behind boxes)
    for (const arrow of layout.stepArrows) {
      this.drawStepConnectorArrow(arrow, colors.bond);
    }

    // Draw step boxes
    for (const box of layout.stepBoxes) {
      const step = scheme.steps[box.stepIndex];
      if (step) {
        const isSelected = box.stepIndex === options.selectedStepIndex;
        const isHovered = box.stepIndex === options.hoveredStepIndex;
        this.drawStepBox(step, box, isSelected, isHovered, options.theme);
      }
    }
  }

  /**
   * Draw a single step box with content
   */
  private drawStepBox(
    step: MechanismStep,
    box: StepBox,
    selected: boolean,
    hovered: boolean,
    theme: string
  ) {
    const colors = COLORS[theme as 'dark' | 'light'];
    const bgColor = hovered ? (theme === 'dark' ? '#2a3a5a' : '#f0f4f8') : (theme === 'dark' ? '#1e2a3a' : '#ffffff');
    const borderColor = selected ? '#4d8dff' : colors.bond;
    const borderWidth = selected ? STEP_BOX_SELECTED_BORDER_WIDTH : STEP_BOX_BORDER_WIDTH;
    const textColor = colors.atom;

    // Draw background
    this.ctx.fillStyle = bgColor;
    this.ctx.fillRect(box.x, box.y, box.width, box.height);

    // Draw border
    this.ctx.strokeStyle = borderColor;
    this.ctx.lineWidth = borderWidth;
    this.ctx.strokeRect(box.x, box.y, box.width, box.height);

    // Draw content with padding
    let yPos = box.y + STEP_BOX_PADDING;
    const xStart = box.x + STEP_BOX_PADDING;
    const contentWidth = box.width - 2 * STEP_BOX_PADDING;

    this.ctx.fillStyle = textColor;
    this.ctx.font = 'bold 12px sans-serif';
    this.ctx.fillText(`Step ${box.stepIndex + 1}`, xStart, yPos);
    yPos += TEXT_LINE_HEIGHT;

    // Draw divider
    this.ctx.strokeStyle = colors.bond;
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(xStart, yPos);
    this.ctx.lineTo(box.x + box.width - STEP_BOX_PADDING, yPos);
    this.ctx.stroke();
    yPos += 8;

    // Draw reactants
    this.ctx.font = '10px sans-serif';
    this.ctx.fillStyle = textColor;
    this.ctx.fillText('Reactants:', xStart, yPos);
    yPos += TEXT_LINE_HEIGHT;

    for (const reactant of step.reactants) {
      const formula = this.getSimplifiedFormula(reactant);
      this.ctx.fillStyle = '#666';
      this.ctx.font = '9px sans-serif';
      this.ctx.fillText(`• ${formula}`, xStart + 8, yPos);
      yPos += TEXT_LINE_HEIGHT;
    }

    yPos += 4;

    // Draw arrows count
    this.ctx.fillStyle = '#4CAF50';
    this.ctx.font = '10px sans-serif';
    this.ctx.fillText(`Mechanism: ${step.arrows.length} arrow${step.arrows.length !== 1 ? 's' : ''}`, xStart, yPos);
    yPos += TEXT_LINE_HEIGHT * 1.5;

    // Draw products
    this.ctx.fillStyle = textColor;
    this.ctx.font = '10px sans-serif';
    this.ctx.fillText('Products:', xStart, yPos);
    yPos += TEXT_LINE_HEIGHT;

    for (const product of step.products) {
      const formula = this.getSimplifiedFormula(product);
      this.ctx.fillStyle = '#666';
      this.ctx.font = '9px sans-serif';
      this.ctx.fillText(`• ${formula}`, xStart + 8, yPos);
      yPos += TEXT_LINE_HEIGHT;
    }
  }

  /**
   * Draw connector arrow between two steps
   */
  private drawStepConnectorArrow(arrow: StepArrow, color: string) {
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = STEP_ARROW_WIDTH;
    this.ctx.lineCap = 'round';

    // Draw line
    this.ctx.beginPath();
    this.ctx.moveTo(arrow.x1, arrow.y1);
    this.ctx.lineTo(arrow.x2, arrow.y2);
    this.ctx.stroke();

    // Draw arrowhead
    const headlen = 12;
    const angle = Math.atan2(arrow.y2 - arrow.y1, arrow.x2 - arrow.x1);

    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.moveTo(arrow.x2, arrow.y2);
    this.ctx.lineTo(arrow.x2 - headlen * Math.cos(angle - Math.PI / 6), arrow.y2 - headlen * Math.sin(angle - Math.PI / 6));
    this.ctx.lineTo(arrow.x2 - headlen * Math.cos(angle + Math.PI / 6), arrow.y2 - headlen * Math.sin(angle + Math.PI / 6));
    this.ctx.closePath();
    this.ctx.fill();
  }

  /**
   * Get simplified formula for molecule (first 3 elements)
   */
  private getSimplifiedFormula(mol: MoleculeDto): string {
    if (mol.atoms.length === 0) return '(empty)';

    // Count atoms by element
    const counts: Record<string, number> = {};
    mol.atoms.forEach((a) => {
      counts[a.element] = (counts[a.element] || 0) + 1;
    });

    // Build formula string (simplified)
    const elements = Object.keys(counts).slice(0, 3); // First 3 elements
    const formula = elements.map((el) => {
      const count = counts[el];
      return count > 1 ? `${el}${count}` : el;
    }).join('');

    return formula || '(unknown)';
  }
}
