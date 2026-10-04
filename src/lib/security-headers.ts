export const CSP_REPORT_ONLY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com https://giscus.app",
  "style-src 'self' 'unsafe-inline' https://giscus.app",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://static.cloudflareinsights.com https://cloudflareinsights.com https://giscus.app",
  "frame-src https://giscus.app",
  "worker-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join('; ');

export function siteHeaders(isPreview: boolean) {
  const previewHeader = isPreview ? '  X-Robots-Tag: noindex, nofollow\n' : '';
  return `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  X-Frame-Options: SAMEORIGIN
  Content-Security-Policy-Report-Only: ${CSP_REPORT_ONLY}
${previewHeader}
/_astro/*
  Cache-Control: public, max-age=31536000, immutable
`;
}
