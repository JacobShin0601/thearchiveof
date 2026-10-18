import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const EXPECTED_PARTS = {
  design: [1, 2],
  execution: [3, 4, 5, 6],
  state: [7, 8, 9],
  safety: [10, 11, 12, 13, 14, 15],
  delivery: [16, 17, 18, 19, 20, 21, 22],
};

function frontmatterValue(source, field) {
  return source.match(new RegExp(`^${field}:\\s*["']?([^"'\\n]+)`, 'm'))?.[1]?.trim();
}

function agentEngineeringPosts(directory) {
  return readdirSync(directory)
    .filter((name) => name.endsWith('.mdx'))
    .flatMap((name) => {
      const source = readFileSync(join(directory, name), 'utf8');
      if (frontmatterValue(source, 'series') !== 'Agent Engineering') return [];
      return [{
        name,
        translationKey: frontmatterValue(source, 'translationKey'),
        order: Number(frontmatterValue(source, 'seriesOrder')),
        part: frontmatterValue(source, 'seriesPart'),
      }];
    })
    .sort((a, b) => a.order - b.order);
}

const koreanPosts = agentEngineeringPosts('src/content/posts/ai');
const englishPosts = agentEngineeringPosts('src/content/posts/en/ai');

test('Agent Engineering has one continuous 22-article learning order', () => {
  assert.equal(koreanPosts.length, 22);
  assert.deepEqual(koreanPosts.map((post) => post.order), Array.from({ length: 22 }, (_, index) => index + 1));
});

test('Agent Engineering stages occupy contiguous article ranges', () => {
  for (const [part, expectedOrders] of Object.entries(EXPECTED_PARTS)) {
    assert.deepEqual(
      koreanPosts.filter((post) => post.part === part).map((post) => post.order),
      expectedOrders,
      `${part} must remain a contiguous learning stage`,
    );
  }
});

test('Korean and English Agent Engineering metadata stay paired', () => {
  assert.equal(englishPosts.length, koreanPosts.length);
  const englishByKey = new Map(englishPosts.map((post) => [post.translationKey, post]));

  for (const koreanPost of koreanPosts) {
    const englishPost = englishByKey.get(koreanPost.translationKey);
    assert.ok(englishPost, `missing English pair for ${koreanPost.translationKey}`);
    assert.equal(englishPost.order, koreanPost.order, `seriesOrder mismatch for ${koreanPost.translationKey}`);
    assert.equal(englishPost.part, koreanPost.part, `seriesPart mismatch for ${koreanPost.translationKey}`);
  }
});
