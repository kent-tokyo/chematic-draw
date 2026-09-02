import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { BatchResultPanel } from '../renderer/components/sidebar/BatchResultPanel';
import type { BatchResultSummary } from '../renderer/store/uiStore';

jest.mock('../renderer/store/uiStore', () => ({
  useUIStore: (selector: (state: { theme: 'dark' }) => unknown) => selector({ theme: 'dark' }),
}));

const failedResult: BatchResultSummary = {
  operation: 'standardize',
  processed: 0,
  failed: 1,
  skipped: 0,
  resultHash: 'fnv1a-32:deadbeef',
  errors: ['Item 1: invalid molecule'],
  timestamp: 1,
  provenance: { engine: 'chematic 0.35.0' },
  items: [{ index: 0, status: 'failed', warnings: [], error: 'invalid molecule' }],
  retry: {
    task: { operation: 'standardize' },
    molecules: [{ atoms: [], bonds: [] }],
  },
};

describe('BatchResultPanel retry control', () => {
  it('shows a retry control for failed results and passes the selected result', () => {
    const onRetry = jest.fn();
    render(<BatchResultPanel results={[failedResult]} onRetry={onRetry} />);

    fireEvent.click(screen.getByRole('button', { name: 'Retry failed batch items' }));

    expect(onRetry).toHaveBeenCalledWith(failedResult);
  });

  it('does not show retry when the latest result has no failures', () => {
    const successfulResult = { ...failedResult, failed: 0, processed: 1, retry: undefined };
    render(<BatchResultPanel results={[successfulResult]} onRetry={jest.fn()} />);

    expect(screen.queryByRole('button', { name: 'Retry failed batch items' })).not.toBeInTheDocument();
  });
});
