import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { personSchema } from '../src/lib/author.ts';

describe('author schema', () => {
  it('adds About and known public profiles for the site author', () => {
    assert.deepEqual(personSchema(), {
      '@type': 'Person',
      name: 'Jacob Shin',
      url: 'https://thearchiveof.com/about/',
      sameAs: ['https://github.com/JacobShin0601'],
    });
  });

  it('does not invent profiles for another byline', () => {
    assert.deepEqual(personSchema('Guest'), {
      '@type': 'Person',
      name: 'Guest',
    });
  });
});
