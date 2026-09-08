import type { MoleculeDto } from '../store/types';
import { moleculeStructureKey } from './moleculeKey';
import { exportCdxml } from './cdxmlExport';

export interface RichCdxmlSession {
  source: string;
  sourcePath: string;
  moleculeKey: string;
}

function cdxmlMoleculeKey(molecule: MoleculeDto): string {
  return JSON.stringify({
    structure: moleculeStructureKey(molecule),
    coordinates: molecule.atoms.map((atom) => [atom.id, atom.x, atom.y]),
  });
}

export function captureRichCdxmlSession(source: string, sourcePath: string, molecule: MoleculeDto): RichCdxmlSession {
  return { source, sourcePath, moleculeKey: cdxmlMoleculeKey(molecule) };
}

/** Preserve the original document only while its represented molecule is unchanged. */
export function canPreserveCdxml(molecule: MoleculeDto, filePath: string, session: RichCdxmlSession | null): boolean {
  return Boolean(
    session &&
    filePath.toLowerCase().endsWith('.cdxml') &&
    cdxmlMoleculeKey(molecule) === session.moleculeKey,
  );
}

export function serializeCdxmlForPath(molecule: MoleculeDto, filePath: string, session: RichCdxmlSession | null): string {
  if (canPreserveCdxml(molecule, filePath, session)) return session!.source;
  return exportCdxml(molecule);
}
