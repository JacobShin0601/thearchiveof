import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { GROWTH_EVENTS, growthEvent, isGrowthEventName, newsletterFieldValues } from '../src/lib/growth.ts';

describe('growth taxonomy', () => {
  it('names the v1 conversion events', () => {
    assert.deepEqual([...GROWTH_EVENTS], [
      'article_view',
      'related_article_click',
      'language_switch',
      'newsletter_impression',
      'newsletter_signup',
      'outbound_click',
    ]);
    assert.equal(isGrowthEventName('article_view'), true);
    assert.equal(isGrowthEventName('page_view'), false);
  });

  it('keeps a provider-neutral event shape', () => {
    assert.deepEqual(growthEvent('newsletter_signup', {
      article_slug: 'ax-is-transformation',
      section: 'AI & AX',
      language: 'ko',
    }), {
      name: 'newsletter_signup',
      payload: {
        article_slug: 'ax-is-transformation',
        section: 'AI & AX',
        language: 'ko',
      },
    });
  });

  it('omits empty newsletter acquisition fields', () => {
    assert.deepEqual(newsletterFieldValues({
      source_article: 'ax-is-transformation',
      source_topic: 'ax',
      language: 'en',
      utm_source: '',
    }), [
      { name: 'source_article', value: 'ax-is-transformation' },
      { name: 'source_topic', value: 'ax' },
      { name: 'language', value: 'en' },
    ]);
  });
});
