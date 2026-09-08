import type { Molecule } from '@chematic/contract';
import { serializeMolecule } from './index';

/** React-compatible props without importing React at runtime. */
export interface SchematicMoleculeReactProps {
  molecule: Molecule;
  ariaLabel?: string;
  readOnly?: boolean;
  onError?: (error: Error) => void;
}

export interface SchematicMoleculeElementProps {
  value: string;
  'aria-label'?: string;
  readonly?: '';
}

/** Convert React wrapper props to Web Component attributes deterministically. */
export function toSchematicMoleculeElementProps(props: SchematicMoleculeReactProps): SchematicMoleculeElementProps {
  try {
    return {
      value: serializeMolecule(props.molecule),
      ...(props.ariaLabel ? { 'aria-label': props.ariaLabel } : {}),
      ...(props.readOnly ? { readonly: '' as const } : {}),
    };
  } catch (error) {
    const normalized = error instanceof Error ? error : new Error(String(error));
    props.onError?.(normalized);
    throw normalized;
  }
}
