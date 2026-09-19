const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PLACEHOLDER = /replace|placeholder|your-|xxx|todo|changeme/i;

export function invalidD1Ids(toml) {
  return [...toml.matchAll(/database_id\s*=\s*"([^"]+)"/g)]
    .map((match) => match[1])
    .filter((id) => PLACEHOLDER.test(id) || !UUID.test(id));
}

export function missingHeadAssets(html, exists) {
  const hrefs = [...html.matchAll(/<(?:link|meta)[^>]+(?:href|content)="(\/[^"]+\.(?:svg|png|ico|webmanifest))"/g)]
    .map((match) => match[1]);
  return [...new Set(hrefs)].filter((href) => !exists(href.slice(1)));
}
