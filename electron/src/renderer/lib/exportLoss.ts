import { MoleculeDto } from '../store/types';
import type { ExportLoss, MoleculeExportFormat } from '../../../../packages/chematic-contract/src/index';

export type { ExportLoss, MoleculeExportFormat } from '../../../../packages/chematic-contract/src/index';

const extensionToFormat: Record<string, MoleculeExportFormat> = {
  smi: 'smiles',
  smiles: 'smiles',
  mol: 'mol-v2000',
  rxn: 'rxn-v2000',
  sdf: 'sdf',
  cml: 'cml',
  cdxml: 'cdxml',
};
const CDXML_ELEMENTS = new Set(['H', 'He', 'Li', 'Be', 'B', 'C', 'N', 'O', 'F', 'Ne', 'Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'Ar', 'K', 'Ca', 'Fe', 'Cu', 'Zn', 'Br', 'Ag', 'I']);

export function formatForFilePath(filePath: string): MoleculeExportFormat {
  const extension = filePath.split(/[\\/.]/).pop()?.toLowerCase() ?? '';
  return extensionToFormat[extension] ?? 'mol-v2000';
}

export function exportLosses(molecule: MoleculeDto, format: MoleculeExportFormat): ExportLoss[] {
  const losses: ExportLoss[] = [];
  const wildcardCount = molecule.atoms.filter((atom) => atom.wildcard === true).length;
  const isotopeCount = molecule.atoms.filter((atom) => atom.isotope !== undefined).length;
  const molFormats: MoleculeExportFormat[] = ['mol-v2000', 'rxn-v2000', 'sdf', 'cml', 'cdxml'];
  const drawingCount = (molecule.drawing?.texts.length ?? 0) + (molecule.drawing?.arrows.length ?? 0) + (molecule.drawing?.brackets.length ?? 0);

  if (drawingCount > 0) {
    losses.push({ code: 'drawing', message: `${drawingCount} drawing annotation${drawingCount === 1 ? '' : 's'} can only be preserved in a session bundle.` });
  }

  if (format === 'cdxml' && molecule.atoms.some((atom) => atom.wildcard === true)) {
    losses.push({
      code: 'wildcard',
      message: 'Wildcard atoms will be written as ordinary carbon in CDXML.',
    });
  }

  if (format === 'cdxml') {
    const unsupportedElements = [...new Set(molecule.atoms.filter((atom) => !atom.wildcard && !CDXML_ELEMENTS.has(atom.element)).map((atom) => atom.element))];
    if (unsupportedElements.length > 0) {
      losses.push({ code: 'unsupported-format', message: `CDXML cannot write element${unsupportedElements.length === 1 ? '' : 's'}: ${unsupportedElements.join(', ')}.` });
    }
    const unsupportedBondOrders = [...new Set(molecule.bonds.filter((bond) => ![1, 2, 3, 4].includes(bond.order)).map((bond) => bond.order))];
    if (unsupportedBondOrders.length > 0) {
      losses.push({ code: 'unsupported-format', message: `CDXML cannot write bond order${unsupportedBondOrders.length === 1 ? '' : 's'}: ${unsupportedBondOrders.join(', ')}.` });
    }
  }

  if (wildcardCount > 0 && molFormats.includes(format) && format !== 'cdxml') {
    losses.push({
      code: 'wildcard',
      message: `${wildcardCount} wildcard atom${wildcardCount === 1 ? '' : 's'} will be written as ordinary carbon by this format.`,
    });
  }

  if (isotopeCount > 0 && (format === 'mol-v2000' || format === 'rxn-v2000' || format === 'sdf')) {
    losses.push({
      code: 'isotope',
      message: `${isotopeCount} isotope label${isotopeCount === 1 ? '' : 's'} will be dropped by this format.`,
    });
  }

  return losses;
}

export function exportLossMessage(filePath: string, losses: ExportLoss[]): string {
  return [
    `Exporting to ${filePath} may lose chemical information:`,
    ...losses.map((loss) => `• ${loss.message}`),
    '',
    'Continue anyway?',
  ].join('\n');
}
