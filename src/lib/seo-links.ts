import { SITE_URL } from '../site-origin.ts';

type Language = 'ko' | 'en';

interface SeoLinksInput {
  canonical: URL | null;
  language: Language;
  alternateLanguageUrl?: string;
}

export function resolveSeoLinks({
  canonical,
  language,
  alternateLanguageUrl,
}: SeoLinksInput) {
  const canonicalUrl = canonical ? new URL(canonical.pathname, SITE_URL) : undefined;
  const alternateUrl = canonicalUrl && alternateLanguageUrl
    ? new URL(alternateLanguageUrl, SITE_URL)
    : undefined;
  const xDefaultUrl = canonicalUrl
    ? language === 'ko'
      ? canonicalUrl
      : alternateUrl
    : undefined;

  return { canonicalUrl, alternateUrl, xDefaultUrl };
}
