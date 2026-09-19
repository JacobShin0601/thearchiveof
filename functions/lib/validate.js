export const ARTICLE_KEY = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const VIEWER_ID = /^[A-Za-z0-9_-]{8,128}$/;
export const REACTIONS = new Set(['useful']);
export const EVENTS = new Set(['reaction_click', 'code_run', 'language_switch']);
export const LANGUAGES = new Set(['ko', 'en']);
export const COMPONENTS = new Set(['useful-reaction', 'language-switch', 'pareto-explorer-v1']);
export const MAX_BODY_BYTES = 2048;

export function isArticleKey(value) {
  return typeof value === 'string' && value.length <= 80 && ARTICLE_KEY.test(value);
}

export function isViewerId(value) {
  return typeof value === 'string' && VIEWER_ID.test(value);
}

export function isReaction(value) {
  return REACTIONS.has(value);
}

export function isEventName(value) {
  return EVENTS.has(value);
}

export function parseJsonObject(text, maxBytes = MAX_BODY_BYTES) {
  if (typeof text !== 'string' || new TextEncoder().encode(text).length > maxBytes) {
    return { ok: false, error: 'payload_too_large' };
  }
  try {
    const value = JSON.parse(text);
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return { ok: false, error: 'malformed_json' };
    }
    return { ok: true, value };
  } catch {
    return { ok: false, error: 'malformed_json' };
  }
}
