const cloudflareBranch = process.env.CF_PAGES_BRANCH ?? '';
const explicitEnvironment = process.env.DEPLOY_ENV ?? '';

export const DEPLOY_BRANCH = cloudflareBranch;
export const IS_PREVIEW = explicitEnvironment === 'preview'
  || (Boolean(cloudflareBranch) && cloudflareBranch !== 'main');
export const IS_PRODUCTION = !IS_PREVIEW;
export const INDEXABLE = IS_PRODUCTION;

export function isVisiblePost(data: { draft: boolean }) {
  return IS_PREVIEW || !data.draft;
}
