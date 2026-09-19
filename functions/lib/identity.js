const encoder = new TextEncoder();

function hex(buffer) {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function hashActor(secret, articleKey, viewerId) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(`${articleKey}:${viewerId}`));
  return hex(signature);
}

export function viewerFrom(request, body = {}) {
  return request.headers.get('X-Viewer-Id') || body.viewerId || new URL(request.url).searchParams.get('viewer') || '';
}
