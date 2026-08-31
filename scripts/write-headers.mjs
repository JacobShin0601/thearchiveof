import { writeFile } from 'node:fs/promises';

const isPreview = process.env.DEPLOY_ENV === 'preview'
  || (Boolean(process.env.CF_PAGES_BRANCH) && process.env.CF_PAGES_BRANCH !== 'main');
const previewHeader = isPreview ? '  X-Robots-Tag: noindex, nofollow\n' : '';
const headers = `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  X-Frame-Options: SAMEORIGIN
${previewHeader}
/_astro/*
  Cache-Control: public, max-age=31536000, immutable
`;

await writeFile(new URL('../dist/_headers', import.meta.url), headers, 'utf8');
