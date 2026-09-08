import { parseComponentIds } from '../renderer/lib/reactionComponentEditor';

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
});
