import { parseComponentIds, parseReactionCoefficients } from '../renderer/lib/reactionComponentEditor';

describe('parseComponentIds', () => {
  it('accepts the exact number of unique trimmed identifiers', () => {
    expect(parseComponentIds(' starting , intermediate ', 2)).toEqual(['starting', 'intermediate']);
  });

  it('accepts an empty list only when the role has no components', () => {
    expect(parseComponentIds('', 0)).toEqual([]);
    expect(parseComponentIds('', 1)).toBeNull();
  });

  it('rejects duplicate or mismatched identifiers', () => {
    expect(parseComponentIds('a, a', 2)).toBeNull();
    expect(parseComponentIds('a', 2)).toBeNull();
    expect(parseComponentIds('a, b, c', 2)).toBeNull();
  });

  it('accepts only count-aligned, finite positive coefficients', () => {
    expect(parseReactionCoefficients('2, 0.5', 2)).toEqual([2, 0.5]);
    expect(parseReactionCoefficients('', 0)).toEqual([]);
    expect(parseReactionCoefficients('1', 2)).toBeNull();
    expect(parseReactionCoefficients('0, 1', 2)).toBeNull();
    expect(parseReactionCoefficients('Infinity, 1', 2)).toBeNull();
    expect(parseReactionCoefficients('1000001', 1)).toBeNull();
  });
});
