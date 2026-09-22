import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Playground } from '../playground';
import * as wasm from '../renderer/wasm/wasmBridge';

jest.mock('../renderer/wasm/wasmBridge', () => ({
  initWasm: jest.fn(async () => undefined),
  parseMolecule: jest.fn((smiles: string) => {
    if (smiles === 'bad') throw new Error('invalid SMILES');
    return { atoms: [{ id: 1, element: 'C', x: 0, y: 0, charge: 0, atom_map: 0 }], bonds: [] };
  }),
  toSvg: jest.fn(() => '<svg role="img"><circle /></svg>'),
  toCanonicalSmiles: jest.fn(() => 'C'),
}));

const mockedParse = wasm.parseMolecule as jest.MockedFunction<typeof wasm.parseMolecule>;

describe('Playground', () => {
  beforeEach(() => {
    mockedParse.mockClear();
  });

  it('loads the local engine and renders an editable structure preview', async () => {
    render(<Playground />);

    expect(await screen.findByText('✓ Ready in your browser')).toBeInTheDocument();
    expect(screen.getByLabelText('2D chemical structure preview')).toContainHTML('<svg');
    expect(screen.getByText('1 atoms · 0 bonds')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('SMILES or chemical structure'), { target: { value: 'CC' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update structure' }));
    await waitFor(() => expect(mockedParse).toHaveBeenLastCalledWith('CC'));
  });

  it('shows a clear parse error while keeping the previous preview', async () => {
    render(<Playground />);
    await screen.findByText('✓ Ready in your browser');

    fireEvent.change(screen.getByLabelText('SMILES or chemical structure'), { target: { value: 'bad' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update structure' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not parse this structure');
    expect(screen.getByLabelText('2D chemical structure preview')).toContainHTML('<svg');
  });
});
