import {
  exportSchemeAsJSON,
  importSchemeFromJSON,
  REACTION_DOCUMENT_SCHEMA,
  REACTION_DOCUMENT_VERSION,
} from '../renderer/lib/schemeExport';
import { ReactionSchemeContext } from '../renderer/store/types';

const scheme: ReactionSchemeContext = {
  id: 'scheme-1',
  title: 'A test reaction',
  description: 'Round-trip fixture',
  steps: [{
    id: 'step-1',
    reactants: [],
    products: [],
    arrows: [],
    mechanismType: 'sn2',
    conditions: {},
    arrowType: 'single',
  }],
  currentStepIndex: 0,
  viewMode: 'step',
};

describe('versioned reaction document JSON', () => {
  it('writes a versioned schema envelope', () => {
    const exported = JSON.parse(exportSchemeAsJSON(scheme, null, null, null));
    expect(exported.schema).toBe(REACTION_DOCUMENT_SCHEMA);
    expect(exported.schema_version).toBe(REACTION_DOCUMENT_VERSION);
    expect(exported.provenance).toMatchObject({
      source_format: 'reaction-document-json',
      operation: 'export-reaction-document',
      engine: 'chematic 0.35.0',
    });
    expect(exported.provenance.result_hash).toMatch(/^fnv1a-32:[0-9a-f]{8}$/);
    expect(exported.scheme).toEqual(scheme);
  });

  it('imports the current schema and preserves authored data', () => {
    const imported = importSchemeFromJSON(exportSchemeAsJSON(scheme, null, null, null));
    expect(imported).toEqual(scheme);
  });

  it('migrates the legacy unversioned envelope with safe defaults', () => {
    const legacy = JSON.stringify({
      version: '1.0',
      scheme: { id: 'scheme-legacy', title: 'Legacy', steps: [{ id: 'legacy-step' }] },
    });
    expect(importSchemeFromJSON(legacy)).toEqual({
      id: 'scheme-legacy',
      title: 'Legacy',
      description: '',
      steps: [{
        id: 'legacy-step', reactants: [], products: [], arrows: [], mechanismType: 'sn2', conditions: {}, arrowType: 'single',
      }],
      currentStepIndex: 0,
      viewMode: 'step',
    });
  });

  it('rejects an unknown future schema instead of guessing its shape', () => {
    expect(importSchemeFromJSON(JSON.stringify({
      schema: REACTION_DOCUMENT_SCHEMA,
      schema_version: 99,
      scheme: { steps: [] },
    }))).toBeNull();
  });

  it('rejects a current document whose provenance hash no longer matches', () => {
    const exported = JSON.parse(exportSchemeAsJSON(scheme, null, null, null));
    exported.scheme.title = 'tampered';
    expect(importSchemeFromJSON(JSON.stringify(exported))).toBeNull();
  });
});
