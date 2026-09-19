const token = process.env.CLOUDFLARE_API_TOKEN;
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;

if (!token || !accountId) {
  throw new Error('Set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID as GitHub Actions secrets.');
}

if (!/^[a-f0-9]{32}$/i.test(accountId)) {
  throw new Error('CLOUDFLARE_ACCOUNT_ID must be the 32-character Account ID, not the API token or Zone ID.');
}

const response = await fetch(
  `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/thearchiveof`,
  { headers: { Authorization: `Bearer ${token}` } },
);
const body = await response.json();

if (!response.ok) {
  const detail = body.errors?.[0]?.message ?? response.statusText;
  throw new Error(`Cloudflare Pages lookup failed (${response.status}): ${detail}`);
}

const project = body.result;
if (project.name !== 'thearchiveof') {
  throw new Error(`Expected Pages project thearchiveof, got ${project.name}`);
}

if (project.production_branch !== 'main') {
  throw new Error(`Expected production branch main, got ${project.production_branch}`);
}

console.log(`Cloudflare Pages project ok (${project.name}, production=${project.production_branch})`);
