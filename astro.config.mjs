import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { unified } from '@astrojs/markdown-remark';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { isPublicSitemapPath } from './src/lib/sitemap.ts';

const isPreview = process.env.DEPLOY_ENV === 'preview'
  || (Boolean(process.env.CF_PAGES_BRANCH) && process.env.CF_PAGES_BRANCH !== 'main');

export default defineConfig({
  site: 'https://thearchiveof.com',
  output: 'static',
  integrations: [mdx(), ...(!isPreview ? [sitemap({
    filter: (page) => isPublicSitemapPath(new URL(page).pathname),
  })] : [])],
  markdown: {
    processor: unified({
      remarkPlugins: [remarkMath],
      rehypePlugins: [rehypeKatex],
    }),
    shikiConfig: {
      theme: 'github-light',
      wrap: true,
    },
  },
  build: {
    format: 'directory',
  },
});
