export const DEFAULT_SOCIAL_IMAGE = '/og.png';

export function resolveSocialImage(path?: string) {
  return path && /^\/og\/[a-z0-9]+(?:-[a-z0-9]+)*\.(png|jpe?g|webp)$/.test(path)
    ? path
    : DEFAULT_SOCIAL_IMAGE;
}
