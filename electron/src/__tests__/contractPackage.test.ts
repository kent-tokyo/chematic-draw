import * as fs from 'fs';
import * as path from 'path';
import { CAPABILITY_FIXTURE_MANIFEST, CAPABILITY_MANIFEST, CONFORMANCE_FIXTURE_MANIFEST } from '../../../packages/chematic-contract/src/index';

describe('Electron-free contract package', () => {
  it('contains no Electron, Zustand, filesystem, or app-private imports', () => {
    const source = fs.readFileSync(path.join(__dirname, '../../../packages/chematic-contract/src/index.ts'), 'utf8');
    expect(source).not.toMatch(/^\s*(?:import|export .* from).*?(?:electron|zustand|['"]fs|window\.electronAPI|\.\.\/\.\.\/electron)/im);
  });

  it('publishes a package-root entrypoint with the checked-in consumer fixtures', () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../packages/chematic-contract/package.json'), 'utf8'));
    expect(manifest.private).toBe(true);
    expect(manifest.exports['.']).toEqual({ types: './src/index.ts', default: './src/index.ts' });
    expect(manifest.files).toEqual(expect.arrayContaining(['src', 'conformance', 'README.md']));
    expect(manifest.dependencies ?? {}).toEqual({});
  });

  it('exposes a unique, dependency-labelled parity manifest', () => {
    const ids = CAPABILITY_MANIFEST.map((capability) => capability.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(expect.arrayContaining([
      'markush', 'polymer', 'nucleic-acid', 'rich-rxn', 'cdxml-presentation',
      'publication-layout', 'embedding', 'chemspider', 'nmr', '3d',
    ]));
    expect(CAPABILITY_MANIFEST.find((capability) => capability.id === 'chemspider')).toMatchObject({
      support: 'external',
      dependency: 'chemspider-api',
    });
    expect(CAPABILITY_MANIFEST.filter((capability) => capability.dependency === 'local').length).toBeGreaterThan(0);
  });

  it('maps every capability to an explicit preserve, warn, or reject fixture gate', () => {
    const capabilities = new Set(CAPABILITY_MANIFEST.map((capability) => capability.id));
    const fixtures = CAPABILITY_FIXTURE_MANIFEST.map((fixture) => fixture.capability);
    expect(new Set(fixtures).size).toBe(fixtures.length);
    expect(fixtures).toHaveLength(capabilities.size);
    expect(fixtures.every((capability) => capabilities.has(capability))).toBe(true);
    expect(CAPABILITY_FIXTURE_MANIFEST).toEqual(expect.arrayContaining([
      { capability: 'nmr', fixture: 'nmr-1h-spectrum-panel', gate: 'preserve' },
      { capability: '3d', fixture: '3d-export-snapshot', gate: 'preserve' },
    ]));
  });

  it('keeps every declared P0 boundary fixture executable and uniquely identified', () => {
    const fixtures = CONFORMANCE_FIXTURE_MANIFEST;
    expect(new Set(fixtures.map((fixture) => fixture.id)).size).toBe(fixtures.length);
    for (const fixture of fixtures) {
      expect(CAPABILITY_MANIFEST.some((capability) => capability.id === fixture.capability)).toBe(true);
      expect(['preserve', 'warn', 'reject']).toContain(fixture.gate);
      expect(fs.existsSync(path.join(__dirname, '../../../', fixture.testPath))).toBe(true);
    }
    expect(fixtures.find((fixture) => fixture.id === 'network-disabled-provider')).toMatchObject({ gate: 'reject', network: 'external' });
    expect(fixtures.filter((fixture) => fixture.network === 'none')).toHaveLength(9);
    expect(fixtures.map((fixture) => fixture.capability)).toEqual(expect.arrayContaining([
      'markush', 'polymer', 'nucleic-acid', 'rich-rxn', 'cdxml-presentation',
      'publication-layout', 'embedding', 'nmr', '3d',
    ]));
  });
});
