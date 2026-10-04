export const GROWTH_EVENTS = [
  'article_view',
  'related_article_click',
  'language_switch',
  'newsletter_impression',
  'newsletter_signup',
  'outbound_click',
] as const;

export type GrowthEventName = (typeof GROWTH_EVENTS)[number];

export interface GrowthEventPayload {
  article_slug?: string;
  article_title?: string;
  topic?: string;
  section?: string;
  language?: 'ko' | 'en';
  source_path?: string;
  destination_url?: string;
}

export interface GrowthEvent {
  name: GrowthEventName;
  payload: GrowthEventPayload;
}

export interface NewsletterAcquisition {
  source_article?: string;
  source_topic?: string;
  language?: 'ko' | 'en';
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

const NEWSLETTER_FIELDS = [
  'source_article',
  'source_topic',
  'language',
  'utm_source',
  'utm_medium',
  'utm_campaign',
] as const satisfies ReadonlyArray<keyof NewsletterAcquisition>;

export function isGrowthEventName(value: string): value is GrowthEventName {
  return (GROWTH_EVENTS as readonly string[]).includes(value);
}

export function growthEvent(name: GrowthEventName, payload: GrowthEventPayload = {}): GrowthEvent {
  return { name, payload };
}

export function newsletterFieldValues(source: NewsletterAcquisition = {}) {
  return NEWSLETTER_FIELDS.flatMap((name) => {
    const value = source[name];
    return value ? [{ name, value }] : [];
  });
}
