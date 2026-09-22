import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NmrSpectrumPanel } from '../renderer/components/sidebar/NmrSpectrumPanel';

describe('NmrSpectrumPanel', () => {
  it('renders a validated experimental spectrum without inventing assignments', () => {
    render(<NmrSpectrumPanel />);
    expect(screen.getByRole('img', { name: '1H spectrum plot' })).toBeInTheDocument();
    expect(screen.getByText(/Generic JSON and Bruker 1D peak lists/)).toBeInTheDocument();
  });

  it('rejects malformed spectrum input while preserving the previous plot', () => {
    render(<NmrSpectrumPanel />);
    const input = screen.getByRole('textbox', { name: 'NMR spectrum JSON' });
    fireEvent.change(input, { target: { value: '{"schema":"chematic-draw/nmr-spectrum","schema_version":1,"nucleus":"1H","peaks":[{"id":"p","shiftPpm":null}],"provenance":{"kind":"manual-entry"}}' } });
    fireEvent.click(screen.getByRole('button', { name: 'Validate and display' }));
    expect(screen.getByRole('alert')).toHaveTextContent('peaks[0].shiftPpm');
    expect(screen.getByRole('img', { name: '1H spectrum plot' })).toBeInTheDocument();
  });

  it('loads a valid generic JSON spectrum file and keeps vendor parsing out of scope', async () => {
    render(<NmrSpectrumPanel />);
    const input = screen.getByLabelText('NMR spectrum file');
    const file = new File([JSON.stringify({ schema: 'chematic-draw/nmr-spectrum', schema_version: 1, nucleus: '13C', peaks: [{ id: 'c1', shiftPpm: 77 }], provenance: { kind: 'experimental-import', source: 'fixture.json' } })], 'fixture.json', { type: 'application/json' });
    fireEvent.change(input, { target: { files: [file] } });
    expect(await screen.findByLabelText('13C NMR spectrum')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('imports a Bruker 1D peak list while retaining its source provenance', async () => {
    render(<NmrSpectrumPanel />);
    const input = screen.getByLabelText('NMR spectrum file');
    const file = new File(['##$NUC1= <1H>\n##$SOLVENT= <DMSO-d6>\n2.50 150'], 'sample.pks', { type: 'text/plain' });
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect((screen.getByRole('textbox', { name: 'NMR spectrum JSON' }) as HTMLTextAreaElement).value).toContain('DMSO-d6'));
    expect(screen.getByLabelText('1H NMR spectrum')).toHaveTextContent('1 peaks');
  });

  it('supports manual peak assignment and keeps it in the JSON document', () => {
    render(<NmrSpectrumPanel />);
    const input = screen.getByRole('textbox', { name: 'NMR spectrum JSON' });
    fireEvent.change(input, { target: { value: JSON.stringify({ schema: 'chematic-draw/nmr-spectrum', schema_version: 1, nucleus: '1H', peaks: [{ id: 'h1', shiftPpm: 7.26 }], provenance: { kind: 'manual-entry' } }) } });
    fireEvent.click(screen.getByRole('button', { name: 'Validate and display' }));

    const assignment = screen.getByRole('textbox', { name: 'h1 assignment' });
    fireEvent.change(assignment, { target: { value: 'H-1 aromatic' } });
    expect(screen.getByRole('img', { name: '1H spectrum plot' })).toBeInTheDocument();
    expect((screen.getByRole('textbox', { name: 'NMR spectrum JSON' }) as HTMLTextAreaElement).value).toContain('H-1 aromatic');
  });

  it('uses a connected download anchor for the validated JSON export', () => {
    const createObjectURL = jest.fn(() => 'blob: nmr');
    const revokeObjectURL = jest.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const append = jest.spyOn(document.body, 'append');
    const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    render(<NmrSpectrumPanel />);
    fireEvent.click(screen.getByRole('button', { name: 'Save JSON' }));
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(append).toHaveBeenCalled();
    expect(click).toHaveBeenCalledTimes(1);
    expect(document.querySelector('a[download="nmr-spectrum.json"]')).toBeNull();
    click.mockRestore();
    append.mockRestore();
  });
});
