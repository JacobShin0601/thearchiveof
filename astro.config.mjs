import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { unified } from '@astrojs/markdown-remark';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { readFileSync } from 'node:fs';

const isPreview = process.env.DEPLOY_ENV === 'preview'
  || (Boolean(process.env.CF_PAGES_BRANCH) && process.env.CF_PAGES_BRANCH !== 'main');
const topicRegistry = JSON.parse(readFileSync(new URL('./src/data/topics.json', import.meta.url), 'utf8'));
const indexableTopicUrls = new Set(topicRegistry.filter((topic) => topic.indexable).map((topic) => `/topics/${topic.slug}/`));

export default defineConfig({
  site: 'https://thearchiveof.com',
  output: 'static',
  integrations: [mdx(), ...(!isPreview ? [sitemap({
    filter: (page) => {
      const pathname = new URL(page).pathname;
      return !pathname.startsWith('/topics/') || pathname === '/topics/' || indexableTopicUrls.has(pathname);
    },
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
