import { MoleculeDto } from '../store/types';

export type MoleculeExportFormat = 'smiles' | 'mol-v2000' | 'sdf' | 'cml' | 'cdxml';

export interface ExportLoss {
  code: 'wildcard' | 'isotope' | 'unsupported-format';
  message: string;
}

const extensionToFormat: Record<string, MoleculeExportFormat> = {
  smi: 'smiles',
  smiles: 'smiles',
  mol: 'mol-v2000',
  sdf: 'sdf',
  cml: 'cml',
  cdxml: 'cdxml',
};

export function formatForFilePath(filePath: string): MoleculeExportFormat {
  const extension = filePath.split(/[\\/.]/).pop()?.toLowerCase() ?? '';
  return extensionToFormat[extension] ?? 'mol-v2000';
}

export function exportLosses(molecule: MoleculeDto, format: MoleculeExportFormat): ExportLoss[] {
  const losses: ExportLoss[] = [];
  const wildcardCount = molecule.atoms.filter((atom) => atom.wildcard === true).length;
  const isotopeCount = molecule.atoms.filter((atom) => atom.isotope !== undefined).length;
  const molFormats: MoleculeExportFormat[] = ['mol-v2000', 'sdf', 'cml'];

  if (format === 'cdxml') {
    losses.push({
      code: 'unsupported-format',
      message: 'CDXML is read-only. Save this document to a different format instead.',
    });
    return losses;
  }

  if (wildcardCount > 0 && molFormats.includes(format)) {
    losses.push({
      code: 'wildcard',
      message: `${wildcardCount} wildcard atom${wildcardCount === 1 ? '' : 's'} will be written as ordinary carbon by this format.`,
    });
  }

  if (isotopeCount > 0 && (format === 'mol-v2000' || format === 'sdf')) {
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
