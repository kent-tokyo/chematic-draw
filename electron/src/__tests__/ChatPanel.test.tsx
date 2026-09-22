import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ChatPanel } from '../renderer/components/sidebar/ChatPanel';
import { runAnalysisInWorker } from '../renderer/lib/analysisWorkerClient';

jest.mock('../renderer/lib/analysisWorkerClient', () => ({
  runAnalysisInWorker: jest.fn(),
}));

const mockedRunAnalysis = runAnalysisInWorker as jest.MockedFunction<typeof runAnalysisInWorker>;

describe('ChatPanel', () => {
  beforeEach(() => {
    mockedRunAnalysis.mockImplementation(async (operation) => {
      if (operation === 'canonical-smiles') return 'CC' as never;
      return { formula: 'C2H6', molecular_weight: 30.07, logp: 1.23, ring_count: 0 } as never;
    });
  });

  afterEach(() => jest.clearAllMocks());

  it('answers common structure questions using local analysis', async () => {
    render(<ChatPanel />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Ask about the molecule' }), { target: { value: 'What is the molecular weight?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    expect(await screen.findByText('Molecular weight: 30.07')).toBeInTheDocument();
    expect(mockedRunAnalysis).toHaveBeenCalledWith('properties', expect.anything());
  });

  it('routes SMILES questions to the canonical serializer', async () => {
    render(<ChatPanel />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Ask about the molecule' }), { target: { value: 'SMILES?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    expect(await screen.findByText('Canonical SMILES: CC')).toBeInTheDocument();
    expect(mockedRunAnalysis).toHaveBeenCalledWith('canonical-smiles', expect.anything());
    expect(mockedRunAnalysis).not.toHaveBeenCalledWith('properties', expect.anything());
  });

  it('explains supported questions instead of claiming unavailable AI', async () => {
    render(<ChatPanel />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Ask about the molecule' }), { target: { value: 'Explain the reaction mechanism' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    await waitFor(() => expect(screen.getByText(/Try: molecular formula/)).toBeInTheDocument());
    expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument();
  });
});
