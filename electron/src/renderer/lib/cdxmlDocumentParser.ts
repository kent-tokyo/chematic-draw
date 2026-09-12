import { CdxmlDocument, CdxmlPage, CdxmlTextRun, CdxmlGraphic, CdxmlGraphicChild, CdxmlRawObject } from './cdxmlExport';
import type { CdxmlContentOrderEntry, CdxmlTransform } from './cdxmlExport';
import { MoleculeDto } from '../store/types';
import { ELEMENTS_BY_ATOMIC_NUMBER } from './chemicalElements';

const ELEMENTS = ELEMENTS_BY_ATOMIC_NUMBER;
function decodeXml(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|amp|quot|apos|lt|gt);/gi, (entity, token: string) => {
    if (token.toLowerCase() === 'amp') return '&';
    if (token.toLowerCase() === 'quot') return '"';
    if (token.toLowerCase() === 'apos') return "'";
    if (token.toLowerCase() === 'lt') return '<';
    if (token.toLowerCase() === 'gt') return '>';
    const codePoint = token.toLowerCase().startsWith('#x') ? Number.parseInt(token.slice(2), 16) : Number.parseInt(token.slice(1), 10);
    return Number.isInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : entity;
  });
}
function attrs(tag: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const match of tag.matchAll(/([A-Za-z][A-Za-z0-9_]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
    result[match[1]] = decodeXml(match[2] ?? match[3] ?? '');
  }
  return result;
}
function finiteNumber(value: string | undefined, label: string): number {
  const parsed = Number(value);
  if (value === undefined || value.trim() === '' || !Number.isFinite(parsed)) throw new Error(`Invalid CDXML ${label}: ${value}`);
  return parsed;
}
function integerNumber(value: string | undefined, label: string): number {
  const parsed = finiteNumber(value, label);
  if (!Number.isInteger(parsed)) throw new Error(`Invalid CDXML ${label}: ${value}`);
  return parsed;
}
function numberPair(value: string | undefined): [number, number] { const parts = (value ?? '').trim().split(/\s+/).map(Number); if (parts.length !== 2 || parts.some((part) => !Number.isFinite(part))) throw new Error(`Invalid CDXML coordinate: ${value}`); return [parts[0], Object.is(-parts[1], -0) ? 0 : -parts[1]]; }

function transform(value: string | undefined, label: string): CdxmlTransform | undefined {
  if (value === undefined) return undefined;
  const parts = value.trim().split(/\s+/).map(Number);
  if (parts.length !== 6 || parts.some((part) => !Number.isFinite(part))) throw new Error(`Invalid CDXML ${label} matrix: ${value}`);
  const [a, b, c, d, tx, ty] = parts;
  return { a, b, c, d, tx, ty };
}

interface ParsedTextTag { attributes: Record<string, string>; value: string; runs?: CdxmlTextRun[]; index: number; }

function graphicChildren(content: string): CdxmlGraphicChild[] {
  const children: Array<CdxmlGraphicChild & { index: number }> = [];
  for (const match of content.matchAll(/<([A-Za-z][A-Za-z0-9_.:-]*)\s*([^>]*)\/\s*>/g)) {
    const attributes = attrs(match[2] ?? '');
    children.push({ name: match[1], ...(Object.keys(attributes).length ? { attributes } : {}), index: match.index ?? 0 });
  }
  for (const match of content.matchAll(/<([A-Za-z][A-Za-z0-9_.:-]*)\s*([^>]*)>([\s\S]*?)<\/\1\s*>/g)) {
    const content = (match[3] ?? '').trim();
    if (content.includes('<')) throw new Error(`Unsupported CDXML graphic child markup: ${match[1]}`);
    const attributes = attrs(match[2] ?? '');
    children.push({ name: match[1], ...(Object.keys(attributes).length ? { attributes } : {}), ...(content ? { content: decodeXml(content) } : {}), index: match.index ?? 0 });
  }
  return children.sort((left, right) => left.index - right.index).map(({ index: _index, ...child }) => child);
}

function graphicFromTag(tag: string, body?: string): CdxmlGraphic {
    const parsed = attrs(tag);
    if (!parsed.id) throw new Error('CDXML graphic is missing id');
    const graphicTransform = transform(parsed.Matrix, 'graphic');
    const attributes = Object.fromEntries(Object.entries(parsed).filter(([key]) => key !== 'id' && key !== 'Matrix'));
    const children = body === undefined ? [] : graphicChildren(body);
    return { id: parsed.id, ...(graphicTransform ? { transform: graphicTransform } : {}), ...(Object.keys(attributes).length ? { attributes } : {}), ...(children.length ? { children } : {}) };
}

function graphicTags(body: string): CdxmlGraphic[] {
  const tags: Array<CdxmlGraphic & { index: number }> = [];
  for (const match of body.matchAll(/<graphic\s+([^>]*)\/\s*>/g)) tags.push({ ...graphicFromTag(match[1] ?? ''), index: match.index ?? 0 });
  for (const match of body.matchAll(/<graphic\s+([^>]*)>([\s\S]*?)<\/graphic\s*>/g)) tags.push({ ...graphicFromTag(match[1] ?? '', match[2] ?? ''), index: match.index ?? 0 });
  return tags.sort((left, right) => left.index - right.index).map(({ index: _index, ...graphic }) => graphic);
}

function contentOrder(body: string, pageId: string): CdxmlContentOrderEntry[] {
  return [...body.matchAll(/<(t|graphic|arrow|fragment|group)\s+([^>]*?)(?:\/\s*>|>)/g)].map((match) => {
    const kind = match[1] === 't' ? (attrs(match[2] ?? '').id === `${pageId}-title` ? 'title' : 'text') : match[1] === 'group' ? 'object' : match[1] as CdxmlContentOrderEntry['kind'];
    return { kind, id: attrs(match[2] ?? '').id ?? (kind === 'title' ? `${pageId}-title` : '') };
  }).filter((entry) => entry.id.length > 0);
}

interface GroupRange { start: number; end: number; rawXml: string; }

function groupRanges(body: string): GroupRange[] {
  const ranges: GroupRange[] = [];
  const tokenPattern = /<\/?group\b[^>]*>/gi;
  const stack: Array<{ start: number; selfClosing: boolean }> = [];
  let match: RegExpExecArray | null;
  while ((match = tokenPattern.exec(body)) !== null) {
    const token = match[0];
    if (/^<\//.test(token)) {
      const opening = stack.pop();
      if (opening && !opening.selfClosing) ranges.push({ start: opening.start, end: tokenPattern.lastIndex, rawXml: body.slice(opening.start, tokenPattern.lastIndex) });
    } else if (!/\/\s*>$/.test(token)) {
      stack.push({ start: match.index, selfClosing: false });
    } else {
      ranges.push({ start: match.index, end: tokenPattern.lastIndex, rawXml: token });
    }
  }
  return ranges.sort((left, right) => left.start - right.start || right.end - left.end);
}

/** Remove opaque groups, but leave groups containing chemistry so their
 * fragments can still be imported into the editable molecule. */
function bodyWithoutOpaqueGroups(body: string): string {
  const ranges = groupRanges(body).filter(({ rawXml }) => !/<fragment\b/i.test(rawXml));
  const removals = ranges.filter((range) => !ranges.some((parent) => parent !== range && parent.start <= range.start && parent.end >= range.end));
  let result = body;
  for (const range of [...removals].sort((left, right) => right.start - left.start)) result = result.slice(0, range.start) + result.slice(range.end);
  return result;
}

/** Capture group objects that contain presentation data only. Chemistry groups
 * are flattened into the editable molecule rather than duplicated on export. */
function rawGroupTags(body: string): CdxmlRawObject[] {
  const objects: CdxmlRawObject[] = [];
  for (const { rawXml } of groupRanges(body)) {
    if (/<fragment\b/i.test(rawXml)) continue;
    const id = attrs(rawXml.match(/^<group\s+([^>]*)>/i)?.[1] ?? '').id;
    if (id) objects.push({ id, tag: 'group', rawXml });
  }
  return objects;
}

function textRuns(content: string): CdxmlTextRun[] {
  return [...content.matchAll(/<s(?:\s+([^>]*)?)?>([\s\S]*?)<\/s\s*>/g)].map((match) => ({
    value: decodeXml((match[2] ?? '').replace(/<[^>]*>/g, '')),
    ...((match[1] ?? '').trim() ? { attributes: attrs(match[1]) } : {}),
  })).filter((run) => run.value.length > 0);
}

/** CDXML text is emitted both as a self-closing node with Label and as a
 * container whose styled <s> children hold the visible text. Keep the parser
 * deliberately small, but do not drop the latter form on import. */
function textTags(body: string): ParsedTextTag[] {
  const tags: ParsedTextTag[] = [];
  for (const match of body.matchAll(/<t\s+([^>]*)\/\s*>/g)) {
    const attributes = attrs(match[1] ?? '');
    tags.push({ attributes, value: attributes.Label ?? '', index: match.index ?? 0 });
  }
  for (const match of body.matchAll(/<t\s+([^>]*)>([\s\S]*?)<\/t\s*>/g)) {
    const attributes = attrs(match[1] ?? '');
    const content = (match[2] ?? '').replace(/<[^>]*>/g, '');
    const runs = textRuns(match[2] ?? '');
    tags.push({ attributes, value: attributes.Label ?? (runs.length ? runs.map((run) => run.value).join('') : decodeXml(content)), ...(runs.length ? { runs } : {}), index: match.index ?? 0 });
  }
  return tags.sort((left, right) => left.index - right.index);
}

type FragmentMatch = RegExpMatchArray;

function parseFragmentAtoms(fragments: FragmentMatch[]): { atoms: MoleculeDto['atoms']; idMap: Map<string, number> } {
  const atoms: MoleculeDto['atoms'] = [];
  const idMap = new Map<string, number>();
  for (const fragment of fragments) {
    for (const tag of (fragment[2] ?? '').matchAll(/<n\s+([^>]*)\/>/g)) {
      const a = attrs(tag[1]);
      const [x, y] = numberPair(a.p);
      const id = integerNumber(a.id, 'atom id');
      if (idMap.has(a.id)) throw new Error(`Duplicate CDXML atom id: ${a.id}`);
      idMap.set(a.id, id);
      const charge = a.Charge === undefined ? 0 : integerNumber(a.Charge, 'charge');
      const isotope = a.Isotope === undefined ? undefined : integerNumber(a.Isotope, 'isotope');
      const atomMap = a.Map === undefined ? 0 : integerNumber(a.Map, 'atom map');
      if (atomMap < 0 || atomMap > 65535) throw new Error(`Invalid CDXML atom map: ${a.Map}`);
      const atomicNumber = integerNumber(a.Element ?? '6', 'element');
      const element = ELEMENTS[atomicNumber];
      if (element === undefined) throw new Error(`Unsupported CDXML element atomic number: ${atomicNumber}`);
      atoms.push({ id, element, x, y, charge, atom_map: atomMap, ...(isotope === undefined ? {} : { isotope }), ...(a.Label !== undefined ? { display_label: a.Label } : {}) });
    }
  }
  return { atoms, idMap };
}

function parseFragmentBonds(fragments: FragmentMatch[], idMap: Map<string, number>): MoleculeDto['bonds'] {
  const bonds: MoleculeDto['bonds'] = [];
  for (const fragment of fragments) {
    for (const tag of (fragment[2] ?? '').matchAll(/<b\s+([^>]*)\/>/g)) {
      const a = attrs(tag[1]);
      const from = idMap.get(a.B);
      const to = idMap.get(a.E);
      if (from === undefined || to === undefined) throw new Error('CDXML bond references unknown atom');
      const order = integerNumber(a.Order ?? '1', 'bond order');
      if (![1, 2, 3, 4].includes(order)) throw new Error(`Invalid CDXML bond order: ${a.Order}`);
      bonds.push({ id: bonds.length + 1, from, to, order, stereo: /Dash/.test(a.Display ?? '') ? 2 : /Wedge/.test(a.Display ?? '') ? 1 : 0 });
    }
  }
  return bonds;
}

function parsePageText(body: string, pageId: string): { text: CdxmlPage['text']; title?: string; titleRuns?: CdxmlTextRun[] } {
  const parsedText = textTags(body);
  const text = parsedText.map(({ attributes: a, value, runs }) => {
    const [x, y] = numberPair(a.p);
    const textAttributes = Object.fromEntries(Object.entries(a).filter(([key]) => !['id', 'p', 'Label'].includes(key)));
    return { id: a.id, x, y, value, ...(runs ? { runs } : {}), ...(Object.keys(textAttributes).length ? { attributes: textAttributes } : {}) };
  }).filter((item) => !item.id.endsWith('-title'));
  const titleTag = parsedText.find(({ attributes: a }) => a.id === `${pageId}-title`);
  return { text, ...(titleTag?.value === undefined ? {} : { title: titleTag.value }), ...(titleTag?.runs ? { titleRuns: titleTag.runs } : {}) };
}

/** Parse the page/annotation layer added by exportCdxmlDocument. Chemistry
 * fragments remain ordinary MoleculeDto values and are never flattened across
 * pages. This is intentionally strict for the writer's stable subset. */
export function parseCdxmlDocument(xml: string): CdxmlDocument {
  if (!/^\s*(?:<\?xml[^>]*>\s*)?<CDXML[ >]/.test(xml)) throw new Error('CDXML document must start with CDXML');
  const pages: CdxmlPage[] = [];
  const pageMatches = [...xml.matchAll(/<page\s+([^>]*)>([\s\S]*?)<\/page>/g)];
  const sourcePages: Array<[string, string]> = pageMatches.length
    ? pageMatches.map((match) => [match[1] ?? '', match[2] ?? ''])
    : [['', xml]];
  for (let index = 0; index < sourcePages.length; index++) {
    const [pageAttributeText, body] = sourcePages[index]; const pageAttrs = attrs(pageAttributeText);
    const pageId = pageAttrs.id || `page-${index + 1}`;
    const bodyWithoutGroups = bodyWithoutOpaqueGroups(body);
    const fragments = [...bodyWithoutGroups.matchAll(/<fragment\s+([^>]*?)(?:\/\s*>|>([\s\S]*?)<\/fragment\s*>)/g)];
    // A page commonly contains one fragment per reactant/product. Preserve
    // every fragment instead of silently dropping all but the first one.
    const { atoms, idMap } = parseFragmentAtoms(fragments);
    const bonds = parseFragmentBonds(fragments, idMap);
    const { text, title, titleRuns } = parsePageText(bodyWithoutGroups, pageId);
    // Some ChemDraw documents omit the page id. Use the same deterministic
    // fallback as the page object so a title with `page-1-title` survives.
    const arrows = [...bodyWithoutGroups.matchAll(/<arrow\s+([^>]*)\/>/g)].map((match) => { const a = attrs(match[1]); const [x1, y1] = numberPair(a.Begin); const [x2, y2] = numberPair(a.End); return { id: a.id, x1, y1, x2, y2, label: a.Label }; });
    const graphics = graphicTags(bodyWithoutGroups);
    const objects = rawGroupTags(body);
    const orderBody = body.replace(/<group\b([^>]*)>[\s\S]*?<\/group\s*>/g, '<group $1/>');
    const order = contentOrder(orderBody, pageId);
    const attributes = Object.fromEntries(Object.entries(pageAttrs).filter(([key]) => !['id', 'Width', 'Height'].includes(key)));
    const width = pageAttrs.Width === undefined ? undefined : finiteNumber(pageAttrs.Width, 'page width');
    const height = pageAttrs.Height === undefined ? undefined : finiteNumber(pageAttrs.Height, 'page height');
    const pageTransform = transform(pageAttrs.Matrix, 'page');
    delete attributes.Matrix;
    if (width !== undefined && width <= 0 || height !== undefined && height <= 0) throw new Error('Invalid CDXML page dimensions');
    pages.push({ id: pageId, molecule: { atoms, bonds }, ...(title !== undefined ? { title } : {}), ...(titleRuns ? { titleRuns } : {}), ...(width === undefined ? {} : { width }), ...(height === undefined ? {} : { height }), ...(pageTransform ? { transform: pageTransform } : {}), ...(text.length ? { text } : {}), ...(graphics.length ? { graphics } : {}), ...(arrows.length ? { arrows } : {}), ...(objects.length ? { objects } : {}), ...(order.length ? { contentOrder: order } : {}), ...(Object.keys(attributes).length ? { attributes } : {}) });
  }
  return { pages };
}
