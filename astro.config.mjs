import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { unified } from '@astrojs/markdown-remark';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { isPublicSitemapPath } from './src/lib/sitemap.ts';
import { SITE_URL } from './src/site-origin.ts';

const isPreview = process.env.DEPLOY_ENV === 'preview'
  || (Boolean(process.env.CF_PAGES_BRANCH) && process.env.CF_PAGES_BRANCH !== 'main');

export default defineConfig({
  site: SITE_URL,
  output: 'static',
  trailingSlash: 'always',
  integrations: [mdx(), ...(!isPreview ? [sitemap({
    filter: (page) => isPublicSitemapPath(new URL(page).pathname),
  })] : [])],
  markdown: {
    processor: unified({
      remarkPlugins: [remarkMath],
      rehypePlugins: [rehypeKatex],
    }),
    shikiConfig: {
      theme: 'github-dark',
      wrap: true,
    },
  },
  build: {
    format: 'directory',
  },
  vite: {
    plugins: [{
      name: 'equity-decision-dev-api',
      enforce: 'post',
      configureServer(server) {
        const equityRoute = pathToFileURL(join(process.cwd(), 'functions/api/equity-decisions', '[id].js')).href;
        const handleEquity = async (req, res, next) => {
          const path = req.url?.split('?')[0] ?? '';
          const match = path.match(/^\/api\/equity-decisions\/([a-z0-9-]+)\/?$/);
          if (!match) return next();
          try {
            // Vite rewrites import() in this file. Node's own import keeps the Pages function out of the dev module runner.
            const load = new Function('href', 'return import(href)');
            const { onRequest } = await load(equityRoute);
            const request = new Request(`http://127.0.0.1${req.url}`, { method: req.method ?? 'GET' });
            const response = await onRequest({ request, params: { id: match[1] } });
            res.statusCode = response.status;
            response.headers.forEach((value, key) => res.setHeader(key, value));
            res.end(Buffer.from(await response.arrayBuffer()));
          } catch (error) {
            res.statusCode = 500;
            res.end(error instanceof Error ? error.message : 'equity feed failed');
          }
        };
        return () => {
          server.middlewares.stack.unshift({ route: '', handle: handleEquity });
        };
      },
    }],
  },
});
