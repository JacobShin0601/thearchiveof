import { ARTICLE_KEYS } from '../_generated/article-keys.js';
import { isArticleKey } from './validate.js';

export function isAllowedArticleKey(value) {
  return isArticleKey(value) && ARTICLE_KEYS.includes(value);
}
