import { MoleculeDto } from '../store/types';
import type { CdxmlDocument as ContractCdxmlDocument, CdxmlLoss as ContractCdxmlLoss } from '../../../../packages/chematic-contract/src/index';
import { ATOMIC_NUMBERS_BY_ELEMENT } from './chemicalElements';
export type { CdxmlDocument, CdxmlPage, CdxmlText, CdxmlTextRun, CdxmlGraphic, CdxmlGraphicChild, CdxmlTransform, CdxmlContentOrderEntry, CdxmlArrow, CdxmlRawObject } from '../../../../packages/chematic-contract/src/index';
export type { CdxmlLoss, CdxmlLossCode } from '../../../../packages/chematic-contract/src/index';

const ELEMENT_ATOMIC_NUMBERS = ATOMIC_NUMBERS_BY_ELEMENT;

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function isXmlAttributeName(value: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_.:-]*$/.test(value);
}

type CdxmlDocument = ContractCdxmlDocument;
type CdxmlLoss = ContractCdxmlLoss;

/** Report representational gaps before the supported-subset writer runs. */
export function cdxmlDocumentLosses(document: CdxmlDocument): CdxmlLoss[] {
  const losses: CdxmlLoss[] = [];
  if (!document || !Array.isArray(document.pages) || document.pages.length === 0) return [{ code: 'invalid-page', path: 'pages', message: 'CDXML document must contain at least one page' }];
  for (const [pageIndex, page] of document.pages.entries()) {
    const path = `pages.${pageIndex}`;
    if (!page.id || (page.width !== undefined && (!Number.isFinite(page.width) || page.width <= 0)) || (page.height !== undefined && (!Number.isFinite(page.height) || page.height <= 0))) losses.push({ code: 'invalid-page', path, message: 'Page id and dimensions must be valid' });
    for (const [atomIndex, atom] of page.molecule.atoms.entries()) {
      if (atom.wildcard === true) losses.push({ code: 'wildcard-atom', path: `${path}.molecule.atoms.${atomIndex}`, message: 'Wildcard atoms are written as carbon in the CDXML subset' });
      if (ELEMENT_ATOMIC_NUMBERS[atom.element] === undefined && atom.wildcard !== true) losses.push({ code: 'unsupported-element', path: `${path}.molecule.atoms.${atomIndex}`, message: `CDXML does not support element: ${atom.element}` });
    }
    for (const [bondIndex, bond] of page.molecule.bonds.entries()) if (![1, 2, 3, 4].includes(bond.order)) losses.push({ code: 'unsupported-bond', path: `${path}.molecule.bonds.${bondIndex}`, message: `CDXML does not support bond order: ${bond.order}` });
  }
  return losses;
}

function writeFragment(molecule: MoleculeDto): string {
  const idByAtomId = new Map(molecule.atoms.map((atom) => [atom.id, atom.id]));
  const nodes = molecule.atoms.map((atom) => {
    const atomicNumber = ELEMENT_ATOMIC_NUMBERS[atom.element];
    if (atomicNumber === undefined && atom.wildcard !== true) throw new Error(`CDXML does not support element: ${atom.element}`);
    const attrs = [`id="${atom.id}"`, `p="${atom.x} ${-atom.y}"`, `Element="${atomicNumber ?? 6}"`];
    if (atom.charge !== 0) attrs.push(`Charge="${atom.charge}"`);
    if (atom.isotope !== undefined) attrs.push(`Isotope="${atom.isotope}"`);
    if (atom.atom_map > 0) attrs.push(`Map="${atom.atom_map}"`);
    if (atom.display_label) attrs.push(`Label="${escapeXml(atom.display_label)}"`);
    return `<n ${attrs.join(' ')}/>`;
  });
  const bonds = molecule.bonds.map((bond) => {
    const begin = idByAtomId.get(bond.from);
    const end = idByAtomId.get(bond.to);
    if (begin === undefined || end === undefined) throw new Error(`CDXML bond ${bond.id} references a missing atom`);
    const attrs = [`B="${begin}"`, `E="${end}"`, `Order="${bond.order}"`];
    if (bond.stereo === 1) attrs.push('Display="WedgeBegin"');
    if (bond.stereo === 2 || bond.stereo === 6) attrs.push('Display="DashBegin"');
    return `<b ${attrs.join(' ')}/>`;
  });
  return `<fragment id="1" Name="${escapeXml('chematic-draw')}">\n${nodes.join('\n')}\n${bonds.join('\n')}\n</fragment>`;
}

function renderTextRuns(runs: NonNullable<ContractCdxmlDocument['pages'][number]['text']>[number]['runs']): string {
  return (runs ?? []).map((run) => {
    const attributes = Object.entries(run.attributes ?? {}).map(([key, value]) => {
      if (!isXmlAttributeName(key) || ['id', 'p', 'Label'].includes(key)) throw new Error(`CDXML text run contains an invalid or reserved attribute name: ${key}`);
      return `${key}="${escapeXml(value)}"`;
    });
    return `<s${attributes.length ? ` ${attributes.join(' ')}` : ''}>${escapeXml(run.value)}</s>`;
  }).join('');
}

function renderTextTag(text: NonNullable<ContractCdxmlDocument['pages'][number]['text']>[number]): string {
  const customAttributes = Object.entries(text.attributes ?? {}).map(([key, value]) => {
    if (!isXmlAttributeName(key) || ['id', 'p', 'Label'].includes(key)) throw new Error(`CDXML text contains an invalid or reserved attribute name: ${key}`);
    return `${key}="${escapeXml(value)}"`;
  });
  const prefix = `<t id="${escapeXml(text.id)}" p="${text.x} ${-text.y}"${customAttributes.length ? ` ${customAttributes.join(' ')}` : ''}`;
  if (!text.runs?.length) return `${prefix} Label="${escapeXml(text.value)}"/>`;
  return `${prefix}>${renderTextRuns(text.runs)}</t>`;
}

function renderGraphic(graphic: NonNullable<ContractCdxmlDocument['pages'][number]['graphics']>[number]): string {
  const customAttributes = Object.entries(graphic.attributes ?? {}).map(([key, value]) => {
    if (!isXmlAttributeName(key) || ['id', 'Matrix'].includes(key)) throw new Error(`CDXML graphic contains an invalid or reserved attribute name: ${key}`);
    return `${key}="${escapeXml(value)}"`;
  });
  if (graphic.transform) customAttributes.push(`Matrix="${[graphic.transform.a, graphic.transform.b, graphic.transform.c, graphic.transform.d, graphic.transform.tx, graphic.transform.ty].join(' ')}"`);
  const children = (graphic.children ?? []).map((child) => {
    if (!/^[A-Za-z][A-Za-z0-9_.:-]*$/.test(child.name) || child.name === 'graphic') throw new Error(`CDXML graphic contains an invalid child tag: ${child.name}`);
    if (child.content !== undefined && child.content.includes('<')) throw new Error(`CDXML graphic child contains invalid XML content: ${child.name}`);
    const attributes = Object.entries(child.attributes ?? {}).map(([key, value]) => {
      if (!isXmlAttributeName(key)) throw new Error(`CDXML graphic child contains an invalid attribute name: ${key}`);
      return `${key}="${escapeXml(value)}"`;
    });
    const content = child.content === undefined ? '' : escapeXml(child.content);
    return content ? `<${child.name}${attributes.length ? ` ${attributes.join(' ')}` : ''}>${content}</${child.name}>` : `<${child.name}${attributes.length ? ` ${attributes.join(' ')}` : ''}/>`;
  }).join('');
  return children
    ? `<graphic id="${escapeXml(graphic.id)}"${customAttributes.length ? ` ${customAttributes.join(' ')}` : ''}>${children}</graphic>`
    : `<graphic id="${escapeXml(graphic.id)}"${customAttributes.length ? ` ${customAttributes.join(' ')}` : ''}/>`;
}

/** Write pages/fragments and the supported publication annotations. */
export function exportCdxmlDocument(document: CdxmlDocument): string {
  if (!document.pages.length) throw new Error('CDXML document must contain at least one page');
  const pages = document.pages.map((page) => {
    const customAttributes = Object.entries(page.attributes ?? {}).map(([key, value]) => {
    if (!isXmlAttributeName(key) || ['id', 'Width', 'Height', 'Matrix'].includes(key)) throw new Error(`CDXML page contains an invalid or reserved attribute name: ${key}`);
      return `${key}="${escapeXml(value)}"`;
    });
    const attrs = [`id="${escapeXml(page.id)}"`, ...customAttributes];
    if (page.width !== undefined) attrs.push(`Width="${page.width}"`);
    if (page.height !== undefined) attrs.push(`Height="${page.height}"`);
    if (page.transform) attrs.push(`Matrix="${[page.transform.a, page.transform.b, page.transform.c, page.transform.d, page.transform.tx, page.transform.ty].join(' ')}"`);
    const titleKey = `${page.id}-title`;
    const blocks = new Map<string, string>();
    if (page.title) blocks.set(`title:${titleKey}`, renderTextTag({ id: titleKey, x: 0, y: 0, value: page.title, runs: page.titleRuns }));
    for (const item of page.text ?? []) blocks.set(`text:${item.id}`, renderTextTag(item));
    for (const graphic of page.graphics ?? []) blocks.set(`graphic:${graphic.id}`, renderGraphic(graphic));
    for (const arrow of page.arrows ?? []) blocks.set(`arrow:${arrow.id}`, `<arrow id="${escapeXml(arrow.id)}" Begin="${arrow.x1} ${-arrow.y1}" End="${arrow.x2} ${-arrow.y2}"${arrow.label ? ` Label="${escapeXml(arrow.label)}"` : ''}/>`);
    for (const object of page.objects ?? []) {
      if (!/^[A-Za-z][A-Za-z0-9_.:-]*$/.test(object.tag) || object.tag === 'CDXML' || object.tag === 'page') throw new Error(`CDXML raw object contains an invalid tag: ${object.tag}`);
      if (!new RegExp(`^<${object.tag}(?:\\s|>)`).test(object.rawXml.trim())) throw new Error(`CDXML raw object does not match its tag: ${object.id}`);
      blocks.set(`object:${object.id}`, object.rawXml);
    }
    const fragment = writeFragment(page.molecule);
    const ordered: string[] = [];
    let fragmentWritten = false;
    for (const entry of page.contentOrder ?? []) {
      if (entry.kind === 'fragment') {
        if (!fragmentWritten) { ordered.push(fragment); fragmentWritten = true; }
        continue;
      }
      const block = blocks.get(`${entry.kind}:${entry.id}`);
      if (block) { ordered.push(block); blocks.delete(`${entry.kind}:${entry.id}`); }
    }
    for (const block of blocks.values()) ordered.push(block);
    if (!fragmentWritten) ordered.push(fragment);
    return `<page ${attrs.join(' ')}>\n${ordered.join('\n')}\n</page>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<CDXML>\n${pages}\n</CDXML>`;
}

/** Write the documented, parser-compatible CDXML molecule subset. */
export function exportCdxml(molecule: MoleculeDto): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<CDXML>\n${writeFragment(molecule)}\n</CDXML>`;
}
