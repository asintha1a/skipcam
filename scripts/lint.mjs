import { readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
for (const dir of ['extension', 'scripts', 'site', 'tests']) {
  for (const file of await readdir(dir, { recursive: true })) {
    if (/\.(?:m?js)$/.test(file)) execFileSync(process.execPath, ['--check', dir + '/' + file], { stdio: 'inherit' });
  }
}
execFileSync('git', ['diff', '--check'], { stdio: 'inherit' });
