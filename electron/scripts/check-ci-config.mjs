import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));
const read = (path) => readFileSync(new URL(path, `file://${repositoryRoot}/`), 'utf8');
const readJson = (path) => JSON.parse(read(path));
const failures = [];

function requireCondition(condition, message) {
  if (!condition) failures.push(message);
}

const appPackage = readJson('electron/package.json');
const packageLock = readJson('electron/package-lock.json');
const contractPackage = readJson('packages/chematic-contract/package.json');
const webPackage = readJson('packages/chematic-web/package.json');
const cargoManifest = read('crates/chem-wasm/Cargo.toml');
const cargoVersion = cargoManifest.match(/^version\s*=\s*"([^"]+)"/m)?.[1];

requireCondition(
  appPackage.version === packageLock.version
    && appPackage.version === packageLock.packages?.['']?.version,
  'electron/package.json and package-lock.json versions must match.',
);
requireCondition(
  appPackage.version === cargoVersion,
  `Application ${appPackage.version} and chem-wasm ${cargoVersion ?? '(missing)'} versions must match.`,
);
requireCondition(
  webPackage.version === contractPackage.version
    && webPackage.dependencies?.['@chematic/contract'] === contractPackage.version,
  '@chematic/web and @chematic/contract versions must match each other.',
);

const tag = process.env.GITHUB_REF?.match(/^refs\/tags\/v(.+)$/)?.[1];
requireCondition(!tag || tag === appPackage.version, `Tag v${tag} must match application ${appPackage.version}.`);

const workflowPaths = [
  '.github/workflows/test.yml',
  '.github/workflows/build.yml',
  '.github/workflows/nightly.yml',
  '.github/workflows/playground-pages.yml',
];
for (const path of workflowPaths) {
  const workflow = read(path);
  requireCondition(
    !/cargo install wasm-pack(?! --version 0\.13\.1 --locked)/.test(workflow),
    `${path} must pin wasm-pack 0.13.1 and install it with --locked.`,
  );
  requireCondition(
    !/(?:actions\/(?:checkout|setup-node)|codecov\/codecov-action)@v[1-6]\b/.test(workflow),
    `${path} must not use a GitHub Action with a retired Node runtime.`,
  );
  requireCondition(
    !/actions\/(?:download|upload)-artifact@v[1-4]\b/.test(workflow),
    `${path} must use artifact transfer actions v5 or later.`,
  );
  requireCondition(
    !/softprops\/action-gh-release@v[1-2]\b/.test(workflow),
    `${path} must use the maintained release-action major.`,
  );
}

const nightly = read('.github/workflows/nightly.yml');
requireCondition(
  nightly.includes('npm audit --omit=dev --audit-level=moderate'),
  'Nightly must block on runtime dependency advisories.',
);
requireCondition(
  /continue-on-error:\s*true[\s\S]{0,160}npm audit --audit-level=moderate/.test(nightly),
  'Nightly must report the full development audit without failing on known build-tool advisories.',
);

const buildWorkflow = read('.github/workflows/build.yml');
requireCondition(
  /release-gate:\s*[\s\S]*?name:\s*Release Candidate Gate/.test(buildWorkflow),
  'Build workflow must define a release candidate gate.',
);
requireCondition(
  /build:\s*\n\s+name:\s*Build\s*\n\s+needs:\s*release-gate/.test(buildWorkflow),
  'Cross-platform builds must depend on the release candidate gate.',
);
for (const command of [
  'npm run verify:candidate',
  'npm run audit:runtime',
  'npm run test:e2e',
  'npm run test:e2e:playground',
  'npm run test:e2e:electron',
]) {
  requireCondition(
    buildWorkflow.includes(command),
    `Release candidate gate must run ${command}.`,
  );
}

const electronConfig = read('electron/playwright.electron.config.ts');
requireCondition(/fullyParallel:\s*false/.test(electronConfig), 'Electron smoke tests must not run fully parallel.');
requireCondition(/workers:\s*1/.test(electronConfig), 'Electron smoke tests must use one worker.');

const smoke = read('electron/e2e/electron-smoke/app.smoke.ts');
requireCondition(
  !/canvas\.click\(\{\s*position:\s*\{\s*x:\s*50,\s*y:\s*50/.test(smoke),
  'Electron smoke interactions must not use the old layout-dependent (50, 50) canvas point.',
);

if (failures.length > 0) {
  for (const failure of failures) console.error(`[ci-config] ${failure}`);
  process.exit(1);
}

console.log('[ci-config] workflow, version, audit, and Electron-smoke invariants passed');
