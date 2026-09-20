export const siteAuthor = {
  name: 'Jacob Shin',
  url: '/about/',
  sameAs: ['https://github.com/JacobShin0601'],
} as const;

const SITE_ORIGIN = 'https://thearchiveof.com';

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

  person.url = new URL(siteAuthor.url, SITE_ORIGIN).toString();
  if (siteAuthor.sameAs.length > 0) person.sameAs = [...siteAuthor.sameAs];
  return person;
}
