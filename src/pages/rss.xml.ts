import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { postPath, SITE_DESCRIPTION, SITE_TITLE } from '../consts';

export async function GET(context: { site: URL }) {
  const posts = (await getCollection('posts', ({ data }) => !data.draft))
    .sort((a, b) => b.data.publishedDate.valueOf() - a.data.publishedDate.valueOf());

  return rss({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.publishedDate,
      link: postPath(post.id),
      categories: [post.data.category, ...post.data.tags],
    })),
    customData: '<language>en-us</language>',
  });
}
