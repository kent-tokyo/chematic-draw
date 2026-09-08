/** Parse the authored component identity list for one reaction role. */
export function parseComponentIds(value: string, expectedCount: number): string[] | null {
  const ids = value.split(',').map((item) => item.trim()).filter(Boolean);
  if (ids.length !== expectedCount || new Set(ids).size !== ids.length) return null;
  return ids;
}
