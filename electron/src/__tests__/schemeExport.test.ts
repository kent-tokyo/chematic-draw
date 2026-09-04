import {
  exportSchemeAsJSON,
  importSchemeFromJSON,
  REACTION_DOCUMENT_SCHEMA,
  REACTION_DOCUMENT_VERSION,
  MAX_REACTION_DOCUMENT_STEPS,
  MAX_REACTION_DOCUMENT_TEXT_LENGTH,
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
      engine: 'chematic 1.0.3',
    });
    expect(exported.provenance.result_hash).toMatch(/^fnv1a-32:[0-9a-f]{8}$/);
    expect(exported.scheme).toEqual(scheme);
    expect(exported.analysis.reactionDiagnostics.status).toBe('not_verified');
    expect(exported.analysis.reactionDiagnostics.stepResults[0].mapping.complete).toBe(false);
  });

  it('imports the current schema and preserves authored data', () => {
    const imported = importSchemeFromJSON(exportSchemeAsJSON(scheme, null, null, null));
    expect(imported).toEqual(scheme);
  });

  it('round-trips v2 agents and stoichiometric coefficients', () => {
    const v2Scheme: ReactionSchemeContext = {
      ...scheme,
      steps: [{
        ...scheme.steps[0],
        reactants: [molecule('C')],
        products: [molecule('O')],
        agents: [molecule('N')],
        reactantComponentIds: ['reactant-1'],
        productComponentIds: ['product-1'],
        agentComponentIds: ['agent-1'],
        reactantCoefficients: [2],
        productCoefficients: [1],
        authored: true,
        derivedFrom: 'step-source-1',
      }],
    };
    const exported = JSON.parse(exportSchemeAsJSON(v2Scheme, null, null, null));
    expect(exported.schema_version).toBe(2);
    expect(importSchemeFromJSON(JSON.stringify(exported))).toEqual(v2Scheme);
  });

  it('rejects v2 coefficient arrays that do not align with molecule arrays', () => {
    const exported = JSON.parse(exportSchemeAsJSON(scheme, null, null, null));
    exported.scheme.steps[0].reactantCoefficients = [0];
    expect(importSchemeFromJSON(JSON.stringify(exported))).toBeNull();
  });

  it('rejects duplicate or misaligned v2 component IDs', () => {
    const exported = JSON.parse(exportSchemeAsJSON(scheme, null, null, null));
    exported.scheme.steps[0].reactantComponentIds = ['a', 'a'];
    expect(importSchemeFromJSON(JSON.stringify(exported))).toBeNull();
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

  it('rejects a current-schema document without provenance evidence', () => {
    const exported = JSON.parse(exportSchemeAsJSON(scheme, null, null, null));
    delete exported.provenance;
    expect(importSchemeFromJSON(JSON.stringify(exported))).toBeNull();
  });

  it('rejects malformed current-schema steps instead of silently defaulting them', () => {
    const exported = JSON.parse(exportSchemeAsJSON(scheme, null, null, null));
    exported.scheme.steps[0].reactants = { invalid: true };
    expect(importSchemeFromJSON(JSON.stringify(exported))).toBeNull();
  });

  it('rejects current-schema arrows with invalid atom references', () => {
    const exported = JSON.parse(exportSchemeAsJSON({
      ...scheme,
      steps: [{
        ...scheme.steps[0],
        reactants: [{ atoms: [{ id: 1, element: 'C', x: 0, y: 0, charge: 0, atom_map: 0 }], bonds: [] }],
        arrows: [{ id: 'arrow-1', sourceAtomId: 1, sinkAtomId: 999, type: 'forward', stepId: 'step-1' }],
      }],
    }, null, null, null));
    delete exported.provenance;
    expect(importSchemeFromJSON(JSON.stringify(exported))).toBeNull();
  });

  it('rejects oversized or excessively long reaction documents before processing', () => {
    expect(importSchemeFromJSON('x'.repeat(MAX_REACTION_DOCUMENT_TEXT_LENGTH + 1))).toBeNull();
    const oversized = JSON.parse(exportSchemeAsJSON(scheme, null, null, null));
    oversized.scheme.steps = Array.from({ length: MAX_REACTION_DOCUMENT_STEPS + 1 }, (_, index) => ({
      ...oversized.scheme.steps[0], id: `step-${index}`,
    }));
    expect(importSchemeFromJSON(JSON.stringify(oversized))).toBeNull();
  });
});

function molecule(element: string) {
  return { atoms: [{ id: 1, element, x: 0, y: 0, charge: 0, atom_map: 0 }], bonds: [] };
}
