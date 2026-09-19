import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_SOCIAL_IMAGE, resolveSocialImage } from '../src/lib/social-image.ts';

describe('social images', () => {
  it('falls back to the site card', () => {
    assert.equal(resolveSocialImage(), DEFAULT_SOCIAL_IMAGE);
    assert.equal(resolveSocialImage('/images/cover.png'), DEFAULT_SOCIAL_IMAGE);
    assert.equal(resolveSocialImage('og/article.png'), DEFAULT_SOCIAL_IMAGE);
  });

  it('accepts a shared article card under /og/', () => {
    assert.equal(
      resolveSocialImage('/og/what-is-optimization-dinner-with-friends.png'),
      '/og/what-is-optimization-dinner-with-friends.png',
    );
  });
});
