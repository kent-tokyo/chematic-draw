import { MoleculeDto } from '../store/types';
import {
  EXTENSION_API_VERSION,
  MAX_DISPLAY_LABEL_LENGTH,
  MAX_ELEMENT_TEXT_LENGTH,
  MAX_MOLECULE_ATOMS,
  MAX_MOLECULE_BONDS,
} from '../../../../packages/chematic-contract/src/index';
export type {
  AnalysisProvider,
  DocumentCommand,
  ExtensionHost,
  ExtensionManifest,
  ExtensionPermission,
} from '../../../../packages/chematic-contract/src/index';
import type {
  AnalysisProvider,
  DocumentCommand,
  DocumentCommandContext,
  ExtensionHost,
  ExtensionManifest,
  ExtensionPermission,
} from '../../../../packages/chematic-contract/src/index';

/** The deliberately small permission vocabulary for local extensions. */
export { EXTENSION_API_VERSION, MAX_DISPLAY_LABEL_LENGTH, MAX_ELEMENT_TEXT_LENGTH, MAX_MOLECULE_ATOMS, MAX_MOLECULE_BONDS } from '../../../../packages/chematic-contract/src/index';

export function validateMoleculeDocument(molecule: MoleculeDto): string[] {
  const errors: string[] = [];
  if (!molecule || !Array.isArray(molecule.atoms) || !Array.isArray(molecule.bonds)) return ['Document must contain atoms and bonds arrays'];
  if (molecule.atoms.length > MAX_MOLECULE_ATOMS) errors.push(`Document exceeds the ${MAX_MOLECULE_ATOMS.toLocaleString()} atom limit`);
  if (molecule.bonds.length > MAX_MOLECULE_BONDS) errors.push(`Document exceeds the ${MAX_MOLECULE_BONDS.toLocaleString()} bond limit`);
  const atomIds = new Set<number>();
  for (const atom of molecule.atoms) {
    if (!atom || typeof atom !== 'object') {
      errors.push('Atom entry must be an object');
      continue;
    }
    if (!Number.isInteger(atom.id) || atomIds.has(atom.id)) errors.push(`Atom id must be unique: ${atom.id}`);
    atomIds.add(atom.id);
    if (typeof atom.element !== 'string' || atom.element.length === 0 || atom.element.length > MAX_ELEMENT_TEXT_LENGTH || atom.element.trim() !== atom.element || !Number.isFinite(atom.x) || !Number.isFinite(atom.y) || !Number.isInteger(atom.charge) || !Number.isInteger(atom.atom_map)) errors.push(`Atom ${atom.id} has invalid identity, coordinates, charge, or map`);
    if (atom.display_label !== undefined && (typeof atom.display_label !== 'string' || atom.display_label.length > MAX_DISPLAY_LABEL_LENGTH)) errors.push(`Atom ${atom.id} has an invalid display label`);
    if (atom.wildcard !== undefined && typeof atom.wildcard !== 'boolean') errors.push(`Atom ${atom.id} has an invalid wildcard flag`);
    if (atom.isotope !== undefined && (!Number.isInteger(atom.isotope) || atom.isotope < 1)) errors.push(`Atom ${atom.id} has an invalid isotope`);
    if (atom.hydrogen_count !== undefined && (!Number.isInteger(atom.hydrogen_count) || atom.hydrogen_count < 0)) errors.push(`Atom ${atom.id} has an invalid hydrogen count`);
  }
  const bondIds = new Set<number>();
  const bondEndpoints = new Set<string>();
  for (const bond of molecule.bonds) {
    if (!bond || typeof bond !== 'object') {
      errors.push('Bond entry must be an object');
      continue;
    }
    if (!Number.isInteger(bond.id) || bondIds.has(bond.id)) errors.push(`Bond id must be unique: ${bond.id}`);
    bondIds.add(bond.id);
    if (!Number.isInteger(bond.from) || !Number.isInteger(bond.to) || !atomIds.has(bond.from) || !atomIds.has(bond.to)) errors.push(`Bond ${bond.id} references a missing atom`);
    if (bond.from === bond.to) errors.push(`Bond ${bond.id} must connect two different atoms`);
    if (Number.isInteger(bond.from) && Number.isInteger(bond.to) && bond.from !== bond.to) {
      const endpoints = bond.from < bond.to ? `${bond.from}:${bond.to}` : `${bond.to}:${bond.from}`;
      if (bondEndpoints.has(endpoints)) errors.push(`Bond ${bond.id} duplicates an existing atom pair`);
      bondEndpoints.add(endpoints);
    }
    if (![1, 2, 3, 4].includes(bond.order) || ![0, 1, 2].includes(bond.stereo)) errors.push(`Bond ${bond.id} has unsupported order or stereo`);
  }
  return errors;
}

function requirePermission(manifest: ExtensionManifest, permission: ExtensionPermission): void {
  if (!manifest.permissions.includes(permission)) throw new Error(`Extension ${manifest.id} lacks ${permission} permission`);
}

export function createExtensionHost(): ExtensionHost {
  const extensions = new Map<string, { manifest: ExtensionManifest; commands: Map<string, DocumentCommand>; providers: Map<string, AnalysisProvider> }>();
  return {
    register(manifest, commands = [], providers = []) {
      if (!/^[a-z][a-z0-9._-]{1,63}$/.test(manifest.id)) throw new Error('Extension id must be lowercase and stable');
      if (manifest.api_version !== undefined && manifest.api_version !== EXTENSION_API_VERSION) {
        throw new Error(`Unsupported extension API version: ${manifest.api_version}`);
      }
      if (extensions.has(manifest.id)) throw new Error(`Extension already registered: ${manifest.id}`);
      const commandMap = new Map<string, DocumentCommand>();
      for (const command of commands) {
        requirePermission(manifest, command.requiredPermission);
        if (commandMap.has(command.id)) throw new Error(`Duplicate command: ${command.id}`);
        commandMap.set(command.id, command);
      }
      const providerMap = new Map<string, AnalysisProvider>();
      for (const provider of providers) {
        requirePermission(manifest, 'analysis:read');
        if (providerMap.has(provider.id)) throw new Error(`Duplicate provider: ${provider.id}`);
        providerMap.set(provider.id, provider);
      }
      extensions.set(manifest.id, { manifest, commands: commandMap, providers: providerMap });
    },
    execute(extensionId, commandId, molecule, payload) {
      const extension = extensions.get(extensionId); const command = extension?.commands.get(commandId);
      if (!extension || !command) throw new Error(`Unknown extension command: ${extensionId}/${commandId}`);
      const inputErrors = validateMoleculeDocument(molecule);
      if (inputErrors.length > 0) throw new Error(`Command received an invalid document: ${inputErrors.join('; ')}`);
      const next = command.execute({ molecule, payload });
      const errors = validateMoleculeDocument(next);
      if (errors.length > 0) throw new Error(`Command produced an invalid document: ${errors.join('; ')}`);
      return next;
    },
    analyze(extensionId, providerId, molecule) {
      const extension = extensions.get(extensionId); const provider = extension?.providers.get(providerId);
      if (!extension || !provider) throw new Error(`Unknown analysis provider: ${extensionId}/${providerId}`);
      const inputErrors = validateMoleculeDocument(molecule);
      if (inputErrors.length > 0) throw new Error(`Analysis received an invalid document: ${inputErrors.join('; ')}`);
      return provider.analyze(molecule);
    },
  };
}
