import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { renderRedirectsFile } from './lib/legacy-redirects.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const target = join(root, 'public', '_redirects');
writeFileSync(target, renderRedirectsFile());
console.log(`Wrote ${target}`);
