import { writeFile } from 'node:fs/promises';
import { siteHeaders } from '../src/lib/security-headers.ts';

const isPreview = process.env.DEPLOY_ENV === 'preview'
  || (Boolean(process.env.CF_PAGES_BRANCH) && process.env.CF_PAGES_BRANCH !== 'main');

await writeFile(new URL('../dist/_headers', import.meta.url), siteHeaders(isPreview), 'utf8');
