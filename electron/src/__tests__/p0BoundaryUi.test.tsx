import React from 'react';
import { render, screen } from '@testing-library/react';
import { DatabaseSearchPanel } from '../renderer/components/sidebar/DatabaseSearchPanel';
import { ReactionAnalysisPanels } from '../renderer/components/sidebar/ReactionAnalysisPanels';
import type { ReactionDiagnostics } from '../renderer/lib/reactionSchemeUtils';
import * as moleculeStore from '../renderer/store/moleculeStore';
import * as uiStore from '../renderer/store/uiStore';

jest.mock('../renderer/store/moleculeStore');
jest.mock('../renderer/store/uiStore');

const molecule = { atoms: [{ id: 1, element: 'C', x: 0, y: 0, charge: 0, atom_map: 0 }], bonds: [] };

const consistentDiagnostics: ReactionDiagnostics = {
  status: 'verified',
  issues: ['Authored document is structurally consistent.'],
  stepResults: [{
    stepIndex: 0,
    status: 'verified',
    atomCount: { reactants: 1, products: 1 },
    atomBalance: { balanced: true, differences: [] },
    chargeBalance: { balanced: true, difference: 0 },
    mapping: { complete: true, duplicateMapNumbers: [], unmatchedMapNumbers: [], mappedAtomCount: 1 },
  }],
  atomBalance: { balanced: true, differences: [] },
  chargeBalance: { balanced: true, difference: 0 },
  continuity: { valid: true, issues: [], boundaries: [] },
  mapping: { complete: true, duplicateMapNumbers: [], unmatchedMapNumbers: [] },
};

describe('P0 product-boundary UI', () => {
  beforeEach(() => {
    (moleculeStore.useMoleculeStore as unknown as jest.Mock).mockImplementation((selector) => selector({
      molecule,
      setMolecule: jest.fn(),
      pushUndo: jest.fn(),
    }));
    (uiStore.useUIStore as unknown as jest.Mock).mockImplementation((selector) => selector({
      theme: 'light', language: 'en', setStatus: jest.fn(),
    }));
  });

  it('keeps ChemSpider visible but unavailable until its provider boundary is configured', () => {
    render(<DatabaseSearchPanel />);
    expect(screen.getByRole('button', { name: 'ChemSpider (unavailable)' })).toBeDisabled();
    expect(screen.getByText(/ChemSpider performs a name lookup only when the Electron host/)).toBeInTheDocument();
  });

  it('labels a passing reaction result as structural consistency instead of chemical verification', () => {
    render(<ReactionAnalysisPanels
      hasSteps
      classification={null}
      diagnostics={consistentDiagnostics}
      atomMappings={null}
      greenMetrics={null}
      atomLabelsVisible={false}
      mappingLinesVisible={false}
      onToggleAtomLabels={jest.fn()}
      onToggleMappingLines={jest.fn()}
      isJapanese={false}
      isDark={false}
      textColor="#111"
      labelColor="#555"
      borderColor="#ddd"
      accentColor="#08f"
    />);

    expect(screen.getByRole('status', { name: 'Reaction structural consistency' })).toHaveTextContent('Reaction Structural Consistency: CONSISTENT');
    expect(screen.getByTestId('reaction-verification-scope')).toHaveTextContent('does not establish mechanism correctness');
    expect(screen.queryByText('Reaction Verification')).not.toBeInTheDocument();
  });
});
