import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { extname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { flattenLegacyRedirects, renderRedirectsFile } from './lib/legacy-redirects.mjs';
import { FORBIDDEN_PUBLIC_LINK_MARKERS } from './lib/scanner-noise-paths.mjs';
import { SITE_URL } from '../src/site-origin.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'dist');
const redirectsFile = join(root, 'public', '_redirects');
const robotsFile = join(dist, 'robots.txt');

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

function webPath(file) {
  return `/${relative(dist, file).split(sep).join('/')}`;
}

function htmlRoute(file) {
  const path = webPath(file);
  if (path === '/index.html') return '/';
  if (path.endsWith('/index.html')) return `${path.slice(0, -'index.html'.length)}`;
  return path.slice(0, -'.html'.length);
}

function attributes(tag) {
  return Object.fromEntries(
    [...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map(([, name, value]) => [name, value]),
  );
}

function linkTags(html) {
  return [...html.matchAll(/<link\b[^>]*>/g)].map(([tag]) => attributes(tag));
}

function metaTags(html) {
  return [...html.matchAll(/<meta\b[^>]*>/g)].map(([tag]) => attributes(tag));
}

function anchorHrefs(html) {
  return [...html.matchAll(/<a\b[^>]*\shref="([^"]+)"/g)].map(([, href]) => href.replaceAll('&amp;', '&'));
}

function parseRedirects() {
  if (!existsSync(redirectsFile)) return [];
  return readFileSync(redirectsFile, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const [source, target, status] = line.split(/\s+/);
      return { source, target, status };
    });
}

function failIfAny(errors) {
  if (errors.length === 0) return;
  throw new Error(`URL contract failed:\n- ${errors.join('\n- ')}`);
}

if (!existsSync(dist)) throw new Error('Run the production build before checking URL contracts.');

const files = walk(dist);
const htmlFiles = files.filter((file) => extname(file) === '.html');
const pages = htmlFiles.map((file) => {
  const html = readFileSync(file, 'utf8');
  const links = linkTags(html);
  const metas = metaTags(html);
  return {
    file,
    route: htmlRoute(file),
    html,
    language: html.match(/<html lang="([^"]+)"/)?.[1],
    robots: metas.find((meta) => meta.name === 'robots')?.content ?? '',
    canonical: links.find((link) => link.rel === 'canonical')?.href,
    alternates: links.filter((link) => link.rel === 'alternate' && link.hreflang),
  };
});

const pageRoutes = new Set(pages.map((page) => page.route));
const staticPaths = new Set(files.map(webPath));
const redirects = parseRedirects();
const catalogRedirects = flattenLegacyRedirects();
const redirectSources = new Set(redirects.map(({ source }) => source));
const errors = [];

const expectedRedirects = renderRedirectsFile().trim();
const actualRedirects = existsSync(redirectsFile)
  ? readFileSync(redirectsFile, 'utf8').trim()
  : '';
if (actualRedirects !== expectedRedirects) {
  errors.push('public/_redirects is out of sync with scripts/lib/legacy-redirects.mjs (run npm run write:redirects)');
}

if (existsSync(robotsFile)) {
  const robots = readFileSync(robotsFile, 'utf8');
  if (!robots.includes(`Sitemap: ${SITE_URL}/sitemap-index.xml`)) {
    errors.push(`robots.txt must declare Sitemap: ${SITE_URL}/sitemap-index.xml`);
  }
} else {
  errors.push('dist/robots.txt is missing');
}

for (const alias of ['/sitemap.xml', '/sitemap_index.xml']) {
  if (!redirectSources.has(alias)) {
    errors.push(`${alias} must permanently redirect to /sitemap-index.xml`);
  }
}

for (const page of pages) {
  const is404 = page.route === '/404';
  const isNoIndex = page.robots.includes('noindex');

  if (is404) {
    if (!isNoIndex) errors.push('404.html must be noindex');
    if (page.canonical) errors.push(`404.html must not declare canonical ${page.canonical}`);
    if (page.alternates.length > 0) errors.push('404.html must not declare hreflang alternates');
    if (page.html.includes('application/ld+json')) errors.push('404.html must not emit structured data');
  } else {
    const expectedCanonical = new URL(page.route, SITE_URL).toString();
    if (page.canonical !== expectedCanonical) {
      errors.push(`${page.route} canonical is ${page.canonical ?? 'missing'}, expected ${expectedCanonical}`);
    }

    const alternates = new Map(page.alternates.map((link) => [link.hreflang, link.href]));
    if (alternates.get(page.language) !== expectedCanonical) {
      errors.push(`${page.route} is missing its ${page.language} self alternate`);
    }
    if (page.language === 'ko' && alternates.get('x-default') !== expectedCanonical) {
      errors.push(`${page.route} x-default must point to the Korean canonical`);
    }
    if (page.language === 'en' && alternates.has('ko') && alternates.get('x-default') !== alternates.get('ko')) {
      errors.push(`${page.route} x-default must point to its Korean alternate`);
    }
  }

  for (const href of anchorHrefs(page.html)) {
    if (/^(?:[a-z]+:|\/\/|#)/i.test(href)) continue;
    const target = new URL(href, new URL(page.route, SITE_URL));
    if (target.origin !== SITE_URL || target.pathname.startsWith('/api/')) continue;
    const targetPath = target.pathname;
    const slashVariant = targetPath.endsWith('/') ? targetPath : `${targetPath}/`;
    for (const marker of FORBIDDEN_PUBLIC_LINK_MARKERS) {
      if (targetPath.includes(marker) || href.includes(marker)) {
        errors.push(`${page.route} links to forbidden scanner/auth path ${targetPath}`);
      }
    }
    if (
      pageRoutes.has(targetPath)
      || pageRoutes.has(slashVariant)
      || staticPaths.has(targetPath)
      || redirectSources.has(targetPath)
    ) continue;
    errors.push(`${page.route} links to missing production path ${targetPath}`);
  }

  if (page.canonical) {
    for (const marker of FORBIDDEN_PUBLIC_LINK_MARKERS) {
      if (page.canonical.includes(marker)) {
        errors.push(`${page.route} canonical points at forbidden path marker ${marker}`);
      }
    }
  }
  for (const alternate of page.alternates) {
    for (const marker of FORBIDDEN_PUBLIC_LINK_MARKERS) {
      if (alternate.href?.includes(marker)) {
        errors.push(`${page.route} hreflang points at forbidden path marker ${marker}`);
      }
    }
  }
}

const pagesByCanonical = new Map(pages.filter((page) => page.canonical).map((page) => [page.canonical, page]));
for (const page of pages) {
  for (const alternate of page.alternates.filter((link) => link.hreflang === 'ko' || link.hreflang === 'en')) {
    if (alternate.href === page.canonical) continue;
    const peer = pagesByCanonical.get(alternate.href);
    if (!peer) {
      errors.push(`${page.route} hreflang target does not exist: ${alternate.href}`);
      continue;
    }
    const reciprocal = peer.alternates.some((link) => link.hreflang === page.language && link.href === page.canonical);
    if (!reciprocal) errors.push(`${page.route} and ${peer.route} do not have reciprocal hreflang links`);
  }
}

for (const { source, target, status } of redirects) {
  if (status !== '301') errors.push(`${source} redirect must be permanent (301)`);
  if (!pageRoutes.has(target) && !staticPaths.has(target)) {
    errors.push(`${source} redirects to missing path ${target}`);
  }
  if (redirectSources.has(target)) errors.push(`${source} creates a redirect chain through ${target}`);
}

for (const entry of catalogRedirects) {
  const match = redirects.find((row) => row.source === entry.source);
  if (!match) {
    errors.push(`catalog redirect missing from _redirects: ${entry.source}`);
    continue;
  }
  if (match.target !== entry.target || match.status !== entry.status) {
    errors.push(`catalog redirect mismatch for ${entry.source}`);
  }
}

const sitemapFiles = files.filter((file) => /^sitemap-\d+\.xml$/.test(relative(dist, file)));
if (sitemapFiles.length > 0) {
  const sitemapUrls = sitemapFiles.flatMap((file) => [
    ...readFileSync(file, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g),
  ].map(([, url]) => url));
  const sitemapSet = new Set(sitemapUrls);
  const indexableSet = new Set(
    pages
      .filter((page) => page.route !== '/404' && !page.robots.includes('noindex'))
      .map((page) => page.canonical),
  );

  if (sitemapSet.size !== sitemapUrls.length) errors.push('sitemap contains duplicate URLs');
  for (const url of sitemapSet) {
    if (!url.startsWith(`${SITE_URL}/`)) errors.push(`sitemap uses a non-canonical origin: ${url}`);
    if (!indexableSet.has(url)) errors.push(`sitemap contains a non-indexable URL: ${url}`);
    for (const marker of FORBIDDEN_PUBLIC_LINK_MARKERS) {
      if (url.includes(marker)) errors.push(`sitemap contains forbidden path marker ${marker}: ${url}`);
    }
  }
  for (const url of indexableSet) {
    if (!sitemapSet.has(url)) errors.push(`indexable page is missing from sitemap: ${url}`);
  }
}

failIfAny(errors);
console.log(`URL contract ok (${pages.length} HTML pages, ${redirects.length} redirects)`);
