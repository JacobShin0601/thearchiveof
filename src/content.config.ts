import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import topicRegistry from './data/topics.json';

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const topicSlugs = new Set(topicRegistry.map((topic) => topic.slug));
const topic = slug.refine((value) => topicSlugs.has(value), 'Use a topic from src/data/topics.json');

const posts = defineCollection({
  loader: glob({ base: './src/content/posts', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    description: z.string().max(180),
    publishedDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    section: z.enum(['Investing', 'AI & AX', 'Lab', 'Mathematics', 'Notes']),
    subsection: z.string().min(1),
    contentType: z.enum(['foundation', 'research', 'current', 'implementation', 'perspective']),
    topics: z.array(topic).default([]),
    primaryTopic: topic.optional(),
    tags: z.array(slug).max(5).default([]),
    author: z.string().default('Jacob Shin'),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
    series: z.string().optional(),
    seriesOrder: z.number().int().positive().optional(),
    language: z.enum(['ko', 'en']).default('ko'),
    translationKey: slug.optional(),
    dataSources: z.array(z.string()).optional(),
    codeRepository: z.url().optional(),
    methodology: z.string().optional(),
    dataThrough: z.coerce.date().optional(),
    freshness: z.enum(['evergreen', 'periodic', 'time-sensitive']).optional(),
    lastReviewed: z.coerce.date().optional(),
    nextReviewDate: z.coerce.date().optional(),
    references: z.array(z.object({
      title: z.string(),
      url: z.url(),
      publisher: z.string().optional(),
    })).optional(),
    pillar: z.boolean().default(false),
    comments: z.boolean().default(false),
  }).superRefine((data, ctx) => {
    if (data.primaryTopic && !data.topics.includes(data.primaryTopic)) {
      ctx.addIssue({ code: 'custom', path: ['primaryTopic'], message: 'primaryTopic must also appear in topics' });
    }
    if (data.lastReviewed && data.nextReviewDate && data.nextReviewDate <= data.lastReviewed) {
      ctx.addIssue({
        code: 'custom',
        path: ['nextReviewDate'],
        message: 'nextReviewDate must be later than lastReviewed',
      });
    }
  }),
});

export const collections = { posts };
