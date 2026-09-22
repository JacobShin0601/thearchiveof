import { hashActor, viewerFrom } from '../../../lib/identity.js';
import { isAllowedOrigin, json, methodNotAllowed, readJson } from '../../../lib/http.js';
import { isAllowedArticleKey } from '../../../lib/keys.js';
import { isArticleKey, isReaction, isViewerId } from '../../../lib/validate.js';

async function countUseful(db, slug) {
  const row = await db.prepare(
    `SELECT COUNT(*) AS count FROM article_reactions
     WHERE article_slug = ? AND reaction_type = 'useful' AND actor_type = 'human'`,
  ).bind(slug).first();
  return Number(row?.count ?? 0);
}

async function viewerRow(db, slug, actorHash) {
  return db.prepare(
    `SELECT id, created_at FROM article_reactions
     WHERE article_slug = ? AND reaction_type = 'useful' AND actor_hash = ?`,
  ).bind(slug, actorHash).first();
}

export async function onRequest(context) {
  const { request, env, params } = context;
  if (!isAllowedOrigin(request)) return json({ ok: false, error: 'forbidden_origin' }, 403);

  const slug = params.slug;
  if (!isArticleKey(slug)) return json({ ok: false, error: 'invalid_slug' }, 400);
  if (!isAllowedArticleKey(slug)) return json({ ok: false, error: 'article_not_found' }, 404);
  if (!env.DB) return json({ ok: false, error: 'unavailable' }, 503);

  if (request.method === 'GET') {
    const viewerId = viewerFrom(request);
    let viewerReacted = false;
    if (isViewerId(viewerId) && env.INTERACTION_SECRET) {
      const actorHash = await hashActor(env.INTERACTION_SECRET, slug, viewerId);
      viewerReacted = Boolean(await viewerRow(env.DB, slug, actorHash));
    }
    return json({
      reaction: 'useful',
      count: await countUseful(env.DB, slug),
      viewerReacted,
    });
  }

  if (request.method !== 'POST') return methodNotAllowed();
  if (!env.INTERACTION_SECRET) return json({ ok: false, error: 'unavailable' }, 503);

  const body = await readJson(request);
  if (!body.ok) return json({ ok: false, error: body.error }, body.status);

  const reaction = body.value.reaction;
  const viewerId = viewerFrom(request, body.value);
  if (!isReaction(reaction)) return json({ ok: false, error: 'invalid_reaction' }, 400);
  if (!isViewerId(viewerId)) return json({ ok: false, error: 'invalid_viewer' }, 400);

  const actorHash = await hashActor(env.INTERACTION_SECRET, slug, viewerId);
  const existing = await viewerRow(env.DB, slug, actorHash);
  const created = existing?.created_at
    ? Date.parse(existing.created_at.includes('T') ? existing.created_at : `${existing.created_at.replace(' ', 'T')}Z`)
    : NaN;
  if (Number.isFinite(created) && Date.now() - created < 1000) {
    return json({ ok: false, error: 'rate_limited' }, 429);
  }

  if (existing) {
    await env.DB.prepare('DELETE FROM article_reactions WHERE id = ?').bind(existing.id).run();
  } else {
    await env.DB.prepare(
      `INSERT INTO article_reactions (article_slug, reaction_type, actor_type, actor_hash)
       VALUES (?, 'useful', 'human', ?)`,
    ).bind(slug, actorHash).run();
  }

  return json({
    ok: true,
    count: await countUseful(env.DB, slug),
    viewerReacted: !existing,
  });
}
