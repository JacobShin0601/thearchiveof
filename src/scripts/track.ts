const EVENTS = new Set(['code_run', 'lab_start', 'language_switch']);
const labStarts = new Set<string>();

export function track(event: string, detail: {
  articleSlug?: string;
  language?: 'ko' | 'en';
  component?: string;
} = {}) {
  if (!EVENTS.has(event)) return;

  // Legacy callers still emit code_run for slider changes. Count the first
  // intentional interaction as one lab_start, never as every slider movement.
  const normalizedEvent = event === 'code_run' ? 'lab_start' : event;
  const key = `${detail.articleSlug ?? ''}:${detail.component ?? ''}`;
  if (normalizedEvent === 'lab_start') {
    if (!detail.articleSlug || !detail.component || labStarts.has(key)) return;
    labStarts.add(key);
  }

  const body = JSON.stringify({
    event: normalizedEvent,
    articleSlug: detail.articleSlug,
    language: detail.language,
    component: detail.component,
  });

  // A keepalive fetch exposes HTTP 400/503 responses (sendBeacon does not).
  // Failures never block the reader. A subsequent interaction may retry.
  try {
    void fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).then((response) => {
      if (!response.ok) {
        if (normalizedEvent === 'lab_start') labStarts.delete(key);
        console.warn('Archive analytics event rejected:', response.status);
      }
    }).catch(() => {
      if (normalizedEvent === 'lab_start') labStarts.delete(key);
    });
  } catch {
    if (normalizedEvent === 'lab_start') labStarts.delete(key);
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
