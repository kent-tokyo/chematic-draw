import { execFileSync } from 'node:child_process';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const electronRoot = process.cwd();
const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const fullCiGate = process.argv.includes('--full');

function run(command, args, cwd) {
  console.log(`\n[candidate] ${command} ${args.join(' ')}`);
  execFileSync(command, args, { cwd, stdio: 'inherit' });
}

run(npmCommand, ['run', 'check:ci-config'], electronRoot);
run('cargo', ['test', '-p', 'chem-wasm'], repositoryRoot);

if (fullCiGate) {
  run('actionlint', [], repositoryRoot);
  run(npmCommand, ['run', 'build:wasm'], electronRoot);
  run(npmCommand, ['run', 'build:wasm:test'], electronRoot);
}

run(npmCommand, ['run', 'typecheck'], electronRoot);
run(npmCommand, ['run', 'lint'], electronRoot);
run(npmCommand, ['test', '--', '--runInBand'], electronRoot);
run(npmCommand, ['run', 'test:coverage', '--', '--runInBand'], electronRoot);

if (fullCiGate) {
  run(npmCommand, ['run', 'audit:runtime'], electronRoot);
  run(npmCommand, ['run', 'test:e2e'], electronRoot);
  run(npmCommand, ['run', 'package'], electronRoot);
  if (process.platform === 'linux') {
    run('xvfb-run', ['-a', npmCommand, 'run', 'test:e2e:electron'], electronRoot);
  } else {
    run(npmCommand, ['run', 'test:e2e:electron'], electronRoot);
  }
}

run('git', ['diff', '--check'], repositoryRoot);
console.log(`\n[candidate] ${fullCiGate ? 'full local CI gate' : 'local'} verification passed`);
