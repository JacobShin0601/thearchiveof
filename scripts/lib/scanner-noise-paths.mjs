/**
 * Paths observed as automated probes / non-product URLs.
 * Never redirect these to `/` or invent compatibility endpoints.
 */
export const SCANNER_NOISE_PATHS = [
  '/auth/callback',
  '/api/auth/signin',
  '/wp-login.php',
  '/xmlrpc.php',
  '/wp-admin',
  '//wp/wp-includes/wlwmanifest.xml',
  '//wp1/wp-includes/wlwmanifest.xml',
  '//xmlrpc.php',
];

/** Substrings that must never appear as internal link / sitemap / redirect targets. */
export const FORBIDDEN_PUBLIC_LINK_MARKERS = [
  '/auth/callback',
  '/api/auth/signin',
  'wp-login.php',
  'xmlrpc.php',
  'wlwmanifest.xml',
  '/wp-admin',
  '/wp-includes/',
];

/**
 * Expected edge behavior for The Archive (static Pages, no OAuth app).
 * 403 is not an application contract — investigate Cloudflare Security Events.
 */
export const EDGE_PATH_POLICY = {
  home: {
    path: '/',
    get: 200,
    head: 200,
    note: 'Normal readers use GET/HEAD. POST/PUT/OPTIONS may be 405 on static Pages.',
  },
  authCallback: {
    path: '/auth/callback',
    existsInApp: false,
    get: 404,
    head: 404,
    note: 'There is no OAuth/login product. Do not add a callback route or redirect to home.',
  },
  wordpressProbes: {
    paths: [
      '/wp-login.php',
      '/xmlrpc.php',
      '//wp/wp-includes/wlwmanifest.xml',
    ],
    get: 404,
    note: 'Missing CMS paths must stay 404. No WordPress compatibility layer.',
  },
};
