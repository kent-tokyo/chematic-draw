import { ReactionSchemeContext, MechanismStep, MoleculeDto, AtomMapping, ReactionClassification, GreenChemistryMetrics } from '../store/types';
import { SchemeLayout } from './schemeLayout';

/**
 * Export complete scheme as JSON
 */
export function exportSchemeAsJSON(
  scheme: ReactionSchemeContext,
  atomMappings: AtomMapping | null,
  reactionClassification: ReactionClassification | null,
  greenMetrics: GreenChemistryMetrics | null
): string {
  const exportData = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    scheme,
    analysis: {
      atomMappings: atomMappings ? { ...atomMappings, entries: Array.from(atomMappings.entries) } : null,
      reactionClassification,
      greenMetrics,
    },
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Import scheme from JSON string
 */
export function importSchemeFromJSON(jsonString: string): ReactionSchemeContext | null {
  try {
    const data = JSON.parse(jsonString);
    if (!data.scheme || !data.scheme.steps) {
      return null;
    }
    return data.scheme as ReactionSchemeContext;
  } catch (error) {
    console.error('Failed to import scheme:', error);
    return null;
  }
}

/**
 * Export scheme as SVG image
 */
export function exportSchemeAsSVG(
  scheme: ReactionSchemeContext,
  schemeLayout: SchemeLayout,
  atomMappings: AtomMapping | null
): string {
  const width = schemeLayout.canvasWidth + 40;
  const height = schemeLayout.canvasHeight + 200;

  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <style>
      .step-box { fill: #f9f9f9; stroke: #333; stroke-width: 2; }
      .step-title { font-size: 14px; font-weight: bold; fill: #333; }
      .step-text { font-size: 10px; fill: #666; }
      .arrow-line { stroke: #666; stroke-width: 2; fill: none; }
      .arrow-head { fill: #666; }
      .atom-label { font-size: 10px; font-weight: bold; }
      .legend-label { font-size: 11px; fill: #333; }
      .metric-text { font-size: 11px; fill: #333; }
    </style>
  </defs>

  <!-- Background -->
  <rect width="${width}" height="${height}" fill="#ffffff"/>

  <!-- Title -->
  <text x="20" y="25" class="legend-label" style="font-size: 16px; font-weight: bold;">
    ${scheme.title || 'Reaction Scheme'}
  </text>

  <!-- Step Boxes -->
  <g transform="translate(20, 60)">
`;

  // Draw step boxes
  for (const box of schemeLayout.stepBoxes) {
    const step = scheme.steps[box.stepIndex];
    if (!step) continue;

    svg += `
    <!-- Step ${box.stepIndex + 1} -->
    <rect x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" class="step-box"/>
    <text x="${box.x + 10}" y="${box.y + 20}" class="step-title">Step ${box.stepIndex + 1}</text>

    <text x="${box.x + 10}" y="${box.y + 45}" class="step-text">Reactants: ${step.reactants.length}</text>
    <text x="${box.x + 10}" y="${box.y + 65}" class="step-text">Arrows: ${step.arrows.length}</text>
    <text x="${box.x + 10}" y="${box.y + 85}" class="step-text">Products: ${step.products.length}</text>
`;
  }

  // Draw arrows between steps
  for (const arrow of schemeLayout.stepArrows) {
    svg += `
    <!-- Arrow ${arrow.fromIndex} -> ${arrow.toIndex} -->
    <line x1="${arrow.x1}" y1="${arrow.y1}" x2="${arrow.x2}" y2="${arrow.y2}" class="arrow-line"/>
    <polygon points="${arrow.x2},${arrow.y2} ${arrow.x2 - 8},${arrow.y2 - 4} ${arrow.x2 - 8},${arrow.y2 + 4}" class="arrow-head"/>
`;
  }

  svg += `
  </g>

  <!-- Color Legend -->
  <g transform="translate(20, ${height - 140})">
    <text x="0" y="0" class="legend-label" style="font-weight: bold;">Atom Mapping Legend:</text>

    <rect x="0" y="10" width="12" height="12" fill="#51cf66"/>
    <text x="18" y="20" class="legend-label">Persistent (Green)</text>

    <rect x="0" y="30" width="12" height="12" fill="#4d8dff"/>
    <text x="18" y="40" class="legend-label">New (Blue)</text>

    <rect x="0" y="50" width="12" height="12" fill="#ff6b6b"/>
    <text x="18" y="60" class="legend-label">Leaving (Red)</text>

    <rect x="0" y="70" width="12" height="12" fill="#888888"/>
    <text x="18" y="80" class="legend-label">Spectator (Gray)</text>
  </g>

  <!-- Metrics Panel -->
  <g transform="translate(${width - 220}, ${height - 140})">
    <text x="0" y="0" class="legend-label" style="font-weight: bold;">Green Chemistry Metrics:</text>
`;

  if (schemeLayout.stepBoxes.length > 0) {
    svg += `
    <text x="0" y="20" class="metric-text">Atom Economy: [pending]</text>
    <text x="0" y="40" class="metric-text">E-Factor: [pending]</text>
`;
  }

  svg += `
  </g>

  <!-- Footer -->
  <text x="20" y="${height - 10}" class="legend-label" style="font-size: 9px;">
    Exported: ${new Date().toLocaleDateString()} | chematic-draw
  </text>
</svg>`;

  return svg;
}

/**
 * Export scheme metrics as CSV
 */
export function exportSchemeAsCSV(
  scheme: ReactionSchemeContext,
  reactionClassification: ReactionClassification | null,
  greenMetrics: GreenChemistryMetrics | null
): string {
  let csv = 'Reaction Summary\n';
  csv += `Title,"${scheme.title || 'Untitled'}"\n`;
  csv += `Description,"${scheme.description || ''}"\n`;
  csv += `Steps,${scheme.steps.length}\n\n`;

  if (reactionClassification) {
    csv += 'Classification\n';
    csv += `Type,"${reactionClassification.type}"\n`;
    csv += `Confidence,"${Math.round(reactionClassification.confidence * 100)}%"\n`;
    csv += `Indicators,"${reactionClassification.indicators.join('; ')}"\n\n`;
  }

  if (greenMetrics) {
    csv += 'Green Chemistry Metrics\n';
    csv += `Atom Economy,"${greenMetrics.atomEconomy}%"\n`;
    csv += `E-Factor,"${greenMetrics.eFactorApprox}"\n\n`;

    csv += 'Step-by-Step Analysis\n';
    csv += 'Step,Waste Atoms,Waste %\n';
    for (const sw of greenMetrics.stepWaste) {
      csv += `${sw.stepIndex + 1},${sw.wasteAtoms},"${Math.round(sw.percentage)}%"\n`;
    }
    csv += '\n';
  }

  csv += 'Mechanism Steps\n';
  csv += 'Step,Reactants,Arrows,Products,Type\n';
  for (let i = 0; i < scheme.steps.length; i++) {
    const step = scheme.steps[i];
    csv += `${i + 1},${step.reactants.length},${step.arrows.length},${step.products.length},"${step.mechanismType}"\n`;
  }

  return csv;
}

/**
 * Get molecule formula (simplified)
 */
export function getMoleculeFormula(mol: MoleculeDto): string {
  if (mol.atoms.length === 0) return '(empty)';

  const counts: Record<string, number> = {};
  mol.atoms.forEach((a) => {
    counts[a.element] = (counts[a.element] || 0) + 1;
  });

  return Object.entries(counts)
    .map(([el, count]) => (count > 1 ? `${el}${count}` : el))
    .join('');
}

/**
 * Get reaction summary text
 */
export function getReactionSummary(
  scheme: ReactionSchemeContext,
  reactionClassification: ReactionClassification | null
): string {
  let summary = `${scheme.title || 'Reaction Scheme'}\n\n`;

  if (reactionClassification) {
    summary += `Type: ${reactionClassification.type.toUpperCase()} (${Math.round(reactionClassification.confidence * 100)}% confidence)\n`;
    summary += `Evidence: ${reactionClassification.indicators.join(', ')}\n\n`;
  }

  summary += `Total Steps: ${scheme.steps.length}\n`;
  summary += `Total Arrows: ${scheme.steps.reduce((sum, s) => sum + s.arrows.length, 0)}\n`;

  return summary;
}
