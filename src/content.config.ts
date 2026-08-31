import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const posts = defineCollection({
  loader: glob({ base: './src/content/posts', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    description: z.string().max(180),
    publishedDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    category: z.enum(['Investing', 'AI & AX', 'Coding', 'Mathematics']),
    tags: z.array(z.string()).default([]),
    author: z.string().default('Jacob Shin'),
    draft: z.boolean().default(false),
  }),
});

export const collections = { posts };
