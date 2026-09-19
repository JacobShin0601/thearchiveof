import type { APIRoute } from 'astro';
import { INDEXABLE } from '../environment';
import { previewRobotsPolicy, productionRobotsPolicy } from '../lib/robots-policy';

export const prerender = true;

export const GET: APIRoute = () => new Response(INDEXABLE ? productionRobotsPolicy : previewRobotsPolicy, {
  headers: { 'Content-Type': 'text/plain; charset=utf-8' },
});
