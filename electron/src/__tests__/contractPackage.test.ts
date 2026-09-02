import * as fs from 'fs';
import * as path from 'path';

describe('Electron-free contract package', () => {
  it('contains no Electron, Zustand, filesystem, or app-private imports', () => {
    const source = fs.readFileSync(path.join(__dirname, '../../../packages/chematic-contract/src/index.ts'), 'utf8');
    expect(source).not.toMatch(/^\s*(?:import|export .* from).*?(?:electron|zustand|['"]fs|window\.electronAPI|\.\.\/\.\.\/electron)/im);
  });
});
