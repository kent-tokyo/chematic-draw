import type { MoleculeDto, PropertiesDto } from '../store/types';
import * as wasmBridge from '../wasm/wasmBridge';
import type { ExtendedPropertiesDto } from '../wasm/wasmBridge';
import { moleculeStructureKey } from './moleculeKey';

const MAX_ENTRIES = 32;
const propertiesCache = new Map<string, PropertiesDto>();
const extendedPropertiesCache = new Map<string, ExtendedPropertiesDto>();
const iupacCache = new Map<string, string>();
const identifiersCache = new Map<string, { inchi: string; inchikey: string }>();

function cached<T>(cache: Map<string, T>, key: string, compute: () => T): T {
  const existing = cache.get(key);
  if (existing !== undefined) {
    cache.delete(key);
    cache.set(key, existing);
    return existing;
  }
  const value = compute();
  cache.set(key, value);
  if (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value as string);
  return value;
}

export function getPropertiesCached(molecule: MoleculeDto): PropertiesDto {
  const key = moleculeStructureKey(molecule);
  return cached(propertiesCache, key, () => wasmBridge.getProperties(molecule));
}

export function getExtendedPropertiesCached(molecule: MoleculeDto): ExtendedPropertiesDto {
  const key = moleculeStructureKey(molecule);
  return cached(extendedPropertiesCache, key, () => wasmBridge.getExtendedProperties(molecule));
}

export function getIupacNameCached(molecule: MoleculeDto): string {
  const key = moleculeStructureKey(molecule);
  return cached(iupacCache, key, () => wasmBridge.getIupacName(molecule));
}

export function getIdentifiersCached(molecule: MoleculeDto): { inchi: string; inchikey: string } {
  const key = moleculeStructureKey(molecule);
  return cached(identifiersCache, key, () => {
    const inchi = wasmBridge.molToInchi(molecule);
    return { inchi, inchikey: wasmBridge.inchiToInchikey(inchi) };
  });
}

export function clearAnalysisCache(): void {
  propertiesCache.clear();
  extendedPropertiesCache.clear();
  iupacCache.clear();
  identifiersCache.clear();
}
