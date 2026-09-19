import { isAllowedOrigin, json, methodNotAllowed, readJson } from '../lib/http.js';
import { isAllowedArticleKey } from '../lib/keys.js';
import { COMPONENTS, isEventName, LANGUAGES } from '../lib/validate.js';

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== 'POST') return methodNotAllowed();
  if (!isAllowedOrigin(request)) return json({ ok: false, error: 'forbidden_origin' }, 403);
  if (!env.DB) return json({ ok: false, error: 'unavailable' }, 503);

  const body = await readJson(request);
  if (!body.ok) return json({ ok: false, error: body.error }, body.status);

  const event = body.value.event;
  const articleSlug = body.value.articleSlug;
  const language = body.value.language;
  const component = body.value.component;
  if (!isEventName(event)) return json({ ok: false, error: 'invalid_event' }, 400);
  if (articleSlug != null && !isAllowedArticleKey(articleSlug)) {
    return json({ ok: false, error: 'invalid_slug' }, 400);
  }
  if (language != null && !LANGUAGES.has(language)) return json({ ok: false, error: 'invalid_language' }, 400);
  if (component != null && !COMPONENTS.has(component)) return json({ ok: false, error: 'invalid_component' }, 400);

  await env.DB.prepare(
    `INSERT INTO interaction_events (event_name, article_slug, language, actor_type, component)
     VALUES (?, ?, ?, 'human', ?)`,
  ).bind(event, articleSlug ?? null, language ?? null, component ?? null).run();

  return json({ ok: true });
}
