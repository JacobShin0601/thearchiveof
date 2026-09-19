const SITE = 'https://thearchiveof.com';

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

export function methodNotAllowed() {
  return json({ ok: false, error: 'method_not_allowed' }, 405);
}

export function isAllowedOrigin(request) {
  const origin = request.headers.get('Origin');
  if (!origin) return request.method === 'GET';
  let parsed;
  try {
    parsed = new URL(origin);
  } catch {
    return false;
  }
  const host = new URL(request.url).host;
  return parsed.host === host
    || origin === SITE
    || parsed.host.endsWith('.pages.dev');
}

export async function readJson(request) {
  const type = request.headers.get('Content-Type') ?? '';
  if (!type.toLowerCase().startsWith('application/json')) {
    return { ok: false, error: 'unsupported_media_type', status: 415 };
  }
  const { parseJsonObject } = await import('./validate.js');
  const parsed = parseJsonObject(await request.text());
  if (!parsed.ok) return { ...parsed, status: parsed.error === 'payload_too_large' ? 413 : 400 };
  return parsed;
}
