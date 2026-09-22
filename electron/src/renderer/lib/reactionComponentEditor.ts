/** Parse the authored component identity list for one reaction role. */
export function parseComponentIds(value: string, expectedCount: number): string[] | null {
  const ids = value.split(',').map((item) => item.trim()).filter(Boolean);
  if (ids.length !== expectedCount || new Set(ids).size !== ids.length) return null;
  return ids;
}

/** Parse authored stoichiometric coefficients without creating a document that
 * the reaction import/export boundary would later reject. */
export function parseReactionCoefficients(value: string, expectedCount: number): number[] | null {
  const coefficients = value.split(',').map((item) => item.trim()).filter(Boolean).map(Number);
  if (
    coefficients.length !== expectedCount
    || coefficients.some((coefficient) => !Number.isFinite(coefficient) || coefficient <= 0 || coefficient > 1_000_000)
  ) return null;
  return coefficients;
}
