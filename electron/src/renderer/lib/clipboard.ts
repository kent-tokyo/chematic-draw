import { MoleculeDto } from '../store/types';
import { runAnalysisInWorker } from './analysisWorkerClient';
import { mergeTemplateIntoMolecule } from './templateMerge';
import { getElectronApi } from '../electronApi';

/** Return the chemically connected portion selected by the user for copy. */
export function moleculeForClipboard(molecule: MoleculeDto): MoleculeDto {
  const selectedAtoms = molecule.atoms.filter((atom) => atom.selected);
  const selectedBonds = molecule.bonds.filter((bond) => bond.selected);
  if (selectedAtoms.length === 0 && selectedBonds.length === 0) return molecule;

  const atomIds = new Set(selectedAtoms.map((atom) => atom.id));
  selectedBonds.forEach((bond) => {
    atomIds.add(bond.from);
    atomIds.add(bond.to);
  });
  return {
    atoms: molecule.atoms.filter((atom) => atomIds.has(atom.id)).map(({ selected: _selected, ...atom }) => atom),
    bonds: molecule.bonds
      .filter((bond) => selectedBonds.includes(bond) || (atomIds.has(bond.from) && atomIds.has(bond.to)))
      .map(({ selected: _selected, ...bond }) => bond),
  };
}

export function hasMoleculeSelection(molecule: MoleculeDto): boolean {
  return molecule.atoms.some((atom) => atom.selected) || molecule.bonds.some((bond) => bond.selected);
}

/** Duplicate only the selected connected structure, offsetting it for immediate inspection. */
export function duplicateMoleculeSelection(molecule: MoleculeDto, offsetX = 20, offsetY = 20): MoleculeDto | null {
  if (!hasMoleculeSelection(molecule)) return null;
  const selected = moleculeForClipboard(molecule);
  const merged = mergeTemplateIntoMolecule(molecule, selected, offsetX, offsetY);
  const originalAtomIds = new Set(molecule.atoms.map((atom) => atom.id));
  const duplicateAtomIds = new Set(merged.atoms.filter((atom) => !originalAtomIds.has(atom.id)).map((atom) => atom.id));
  const originalBondIds = new Set(molecule.bonds.map((bond) => bond.id));
  return {
    atoms: merged.atoms.map((atom) => ({ ...atom, selected: duplicateAtomIds.has(atom.id) })),
    bonds: merged.bonds.map((bond) => ({ ...bond, selected: !originalBondIds.has(bond.id) && duplicateAtomIds.has(bond.from) && duplicateAtomIds.has(bond.to) })),
  };
}

export async function copyText(text: string): Promise<void> {
  const electronApi = getElectronApi();
  if (electronApi) {
    const result = await electronApi.copyToClipboard('text/plain', text);
    if (!result.success) throw new Error(result.error);
    return;
  }
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    await navigator.clipboard.writeText(text);
    return;
  }
  throw new Error('Clipboard API not available');
}

export async function copyMoleculeSmiles(mol: MoleculeDto): Promise<void> {
  const electronApi = getElectronApi();
  if (electronApi) {
    const smiles = await runAnalysisInWorker('canonical-smiles', moleculeForClipboard(mol)) as string;
    const result = await electronApi.copyToClipboard('text/plain', smiles);
    if (!result.success) throw new Error(result.error);
    return;
  }
  await copyText(await runAnalysisInWorker('canonical-smiles', moleculeForClipboard(mol)) as string);
}

export async function copyMoleculeMol(mol: MoleculeDto): Promise<void> {
  const electronApi = getElectronApi();
  if (electronApi) {
    const molContent = await runAnalysisInWorker('mol-v2000', mol) as string;
    const result = await electronApi.copyToClipboard('text/plain', molContent);
    if (!result.success) throw new Error(result.error);
    return;
  }
  await copyText(await runAnalysisInWorker('mol-v2000', mol) as string);
}

export async function pasteFromClipboard(): Promise<string> {
  const electronApi = getElectronApi();
  if (electronApi) {
    const result = await electronApi.pasteFromClipboard();
    if (!result.success) throw new Error(result.error);
    return result.content || '';
  }
  if (typeof navigator !== 'undefined' && navigator.clipboard) return await navigator.clipboard.readText();
  throw new Error('Clipboard API not available');
}

export async function parsePastedContent(text: string): Promise<MoleculeDto> {
  try {
    return await runAnalysisInWorker('parse', undefined, undefined, undefined, text) as MoleculeDto;
  } catch (err) {
    throw new Error(`Invalid chemical format: ${(err as Error).message}`);
  }
}
