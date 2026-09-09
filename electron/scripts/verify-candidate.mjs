import { execFileSync } from 'node:child_process';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const electronRoot = process.cwd();
const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function run(command, args, cwd) {
  console.log(`\n[candidate] ${command} ${args.join(' ')}`);
  execFileSync(command, args, { cwd, stdio: 'inherit' });
}

run(npmCommand, ['run', 'typecheck'], electronRoot);
run(npmCommand, ['run', 'lint'], electronRoot);
run(npmCommand, ['test', '--', '--runInBand'], electronRoot);
run(npmCommand, ['run', 'test:coverage', '--', '--runInBand'], electronRoot);
run('git', ['diff', '--check'], repositoryRoot);
console.log('\n[candidate] local verification passed');
