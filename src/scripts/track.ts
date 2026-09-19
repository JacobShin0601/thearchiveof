const EVENTS = new Set(['reaction_click', 'code_run', 'language_switch']);

export function track(event: string, detail: {
  articleSlug?: string;
  language?: 'ko' | 'en';
  component?: string;
} = {}) {
  if (!EVENTS.has(event)) return;
  const body = JSON.stringify({
    event,
    articleSlug: detail.articleSlug,
    language: detail.language,
    component: detail.component,
  });
  try {
    navigator.sendBeacon('/api/events', new Blob([body], { type: 'application/json' }));
  } catch {
    fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => undefined);
  }
}

const VIEWER_KEY = 'archive-viewer-id';

export function viewerId() {
  const existing = localStorage.getItem(VIEWER_KEY);
  if (existing) return existing;
  const created = crypto.randomUUID();
  localStorage.setItem(VIEWER_KEY, created);
  return created;
}
