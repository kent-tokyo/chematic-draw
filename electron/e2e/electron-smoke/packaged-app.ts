import fs from 'node:fs';
import path from 'node:path';

const ELECTRON_DIR = path.resolve(__dirname, '..', '..');

const hasPackagedResources = (resourceDir: string) =>
  fs.existsSync(path.join(resourceDir, 'app', 'package.json'))
  || fs.existsSync(path.join(resourceDir, 'app.asar'));

const launchTarget = (appRoot: string, resourceDir: string) =>
  fs.existsSync(path.join(resourceDir, 'app.asar'))
    ? path.join(resourceDir, 'app.asar')
    : appRoot;

/**
 * electron-forge package writes a runnable app under out/, not at the
 * workspace's source package root. Resolve the directory by its packaged
 * resources so this stays portable across Linux, macOS, and Windows naming.
 */
export function packagedAppPath(): string {
  const override = process.env.CHEMATIC_ELECTRON_APP_PATH;
  if (override) return path.resolve(override);

  const outDir = path.join(ELECTRON_DIR, 'out');
  const packageRoots = fs.existsSync(outDir)
    ? fs.readdirSync(outDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(outDir, entry.name))
      .flatMap((candidate) => {
        if (hasPackagedResources(path.join(candidate, 'resources'))) {
          return [launchTarget(candidate, path.join(candidate, 'resources'))];
        }
        const appBundles = fs.readdirSync(candidate, { withFileTypes: true })
          .filter((entry) => entry.isDirectory() && entry.name.endsWith('.app'))
          .map((entry) => path.join(candidate, entry.name))
          .filter((appBundle) => hasPackagedResources(path.join(appBundle, 'Contents', 'Resources')))
          .map((appBundle) => launchTarget(appBundle, path.join(appBundle, 'Contents', 'Resources')));
        return appBundles;
      })
    : [];

  if (packageRoots.length !== 1) {
    throw new Error(
      `Expected exactly one packaged Electron app under ${outDir}; found ${packageRoots.length}. `
      + 'Run "npm run package" first or set CHEMATIC_ELECTRON_APP_PATH.'
    );
  }
  return packageRoots[0];
}
