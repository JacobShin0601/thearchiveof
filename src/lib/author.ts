import { SITE_URL } from '../site-origin.ts';

export const siteAuthor = {
  name: 'Jacob Shin',
  url: '/about/',
  sameAs: ['https://github.com/JacobShin0601'],
} as const;

export function personSchema(name: string = siteAuthor.name) {
  const person: {
    '@type': 'Person';
    name: string;
    url?: string;
    sameAs?: string[];
  } = {
    '@type': 'Person',
    name,
  };

  if (name !== siteAuthor.name) return person;

  person.url = new URL(siteAuthor.url, SITE_URL).toString();
  if (siteAuthor.sameAs.length > 0) person.sameAs = [...siteAuthor.sameAs];
  return person;
}
