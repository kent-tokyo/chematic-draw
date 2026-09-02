import { CdxmlDocument, CdxmlPage } from './cdxmlExport';
import { MoleculeDto } from '../store/types';

const ELEMENTS: Record<number, string> = { 1: 'H', 5: 'B', 6: 'C', 7: 'N', 8: 'O', 9: 'F', 15: 'P', 16: 'S', 17: 'Cl', 35: 'Br', 53: 'I' };
function attrs(tag: string): Record<string, string> { const result: Record<string, string> = {}; for (const match of tag.matchAll(/([A-Za-z][A-Za-z0-9_]*)="([^"]*)"/g)) result[match[1]] = match[2]; return result; }
function numberPair(value: string | undefined): [number, number] { const parts = (value ?? '').trim().split(/\s+/).map(Number); if (parts.length < 2 || parts.some((part) => !Number.isFinite(part))) throw new Error(`Invalid CDXML coordinate: ${value}`); return [parts[0], Object.is(-parts[1], -0) ? 0 : -parts[1]]; }

/** Parse the page/annotation layer added by exportCdxmlDocument. Chemistry
 * fragments remain ordinary MoleculeDto values and are never flattened across
 * pages. This is intentionally strict for the writer's stable subset. */
export function parseCdxmlDocument(xml: string): CdxmlDocument {
  if (!/^\s*(?:<\?xml[^>]*>\s*)?<CDXML[ >]/.test(xml)) throw new Error('CDXML document must start with CDXML');
  const pages: CdxmlPage[] = [];
  const pageMatches = [...xml.matchAll(/<page\s+([^>]*)>([\s\S]*?)<\/page>/g)];
  const sourcePages = pageMatches.length ? pageMatches : [[ '', xml ] as unknown as RegExpMatchArray];
  for (let index = 0; index < sourcePages.length; index++) {
    const pageMatch = sourcePages[index]; const pageAttrs = attrs(pageMatch[1] ?? ''); const body = pageMatch[2] ?? '';
    const fragment = body.match(/<fragment\s+([^>]*)>([\s\S]*?)<\/fragment>/); if (!fragment) throw new Error('CDXML page has no fragment');
    const atoms: MoleculeDto['atoms'] = []; const idMap = new Map<string, number>();
    for (const tag of fragment[2].matchAll(/<n\s+([^>]*)\/>/g)) { const a = attrs(tag[1]); const [x, y] = numberPair(a.p); const id = Number(a.id); if (!Number.isInteger(id)) throw new Error(`Invalid CDXML atom id: ${a.id}`); idMap.set(a.id, id); const atom = { id, element: ELEMENTS[Number(a.Element ?? 6)] ?? 'C', x, y, charge: Number(a.Charge ?? 0), atom_map: 0, ...(a.Isotope ? { isotope: Number(a.Isotope) } : {}), ...(a.Label !== undefined ? { display_label: a.Label } : {}) }; atoms.push(atom); }
    const bonds: MoleculeDto['bonds'] = []; for (const tag of fragment[2].matchAll(/<b\s+([^>]*)\/>/g)) { const a = attrs(tag[1]); const from = idMap.get(a.B); const to = idMap.get(a.E); if (from === undefined || to === undefined) throw new Error('CDXML bond references unknown atom'); bonds.push({ id: bonds.length + 1, from, to, order: Number(a.Order ?? 1), stereo: /Dash/.test(a.Display ?? '') ? 2 : /Wedge/.test(a.Display ?? '') ? 1 : 0 }); }
    const text = [...body.matchAll(/<t\s+([^>]*)\/>/g)].map((match) => { const a = attrs(match[1]); const [x, y] = numberPair(a.p); return { id: a.id, x, y, value: a.Label ?? '' }; }).filter((item) => !item.id.endsWith('-title'));
    const title = [...body.matchAll(/<t\s+([^>]*)\/>/g)].map((match) => attrs(match[1])).find((a) => a.id === `${pageAttrs.id}-title`)?.Label;
    const arrows = [...body.matchAll(/<arrow\s+([^>]*)\/>/g)].map((match) => { const a = attrs(match[1]); const [x1, y1] = numberPair(a.Begin); const [x2, y2] = numberPair(a.End); return { id: a.id, x1, y1, x2, y2, label: a.Label }; });
    const attributes = Object.fromEntries(Object.entries(pageAttrs).filter(([key]) => !['id', 'Width', 'Height'].includes(key)));
    pages.push({ id: pageAttrs.id || `page-${index + 1}`, molecule: { atoms, bonds }, ...(title !== undefined ? { title } : {}), ...(pageAttrs.Width ? { width: Number(pageAttrs.Width) } : {}), ...(pageAttrs.Height ? { height: Number(pageAttrs.Height) } : {}), ...(text.length ? { text } : {}), ...(arrows.length ? { arrows } : {}), ...(Object.keys(attributes).length ? { attributes } : {}) });
  }
  return { pages };
}
