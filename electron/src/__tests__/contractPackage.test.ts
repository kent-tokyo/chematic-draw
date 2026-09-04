import * as fs from 'fs';
import * as path from 'path';
import { CAPABILITY_MANIFEST } from '../../../packages/chematic-contract/src/index';

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
      'publication-layout', 'embedding', 'chemspider',
    ]));
    expect(CAPABILITY_MANIFEST.find((capability) => capability.id === 'chemspider')).toMatchObject({
      support: 'external',
      dependency: 'chemspider-api',
    });
    expect(CAPABILITY_MANIFEST.filter((capability) => capability.dependency === 'local').length).toBeGreaterThan(0);
  });
});
