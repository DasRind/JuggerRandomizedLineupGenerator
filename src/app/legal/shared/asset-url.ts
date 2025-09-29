export function resolvePublicAssetUrl(relativePath: string): string {
  if (/^https?:\/\//i.test(relativePath)) return relativePath;

  if (typeof window === 'undefined') {
    return relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  }

  const { origin, pathname } = window.location;

  const directoryPath = (() => {
    if (!pathname || pathname === '/') {
      return '/';
    }
    if (pathname.endsWith('/')) {
      return pathname;
    }
    const idx = pathname.lastIndexOf('/');
    if (idx === -1) {
      return '/';
    }
    return pathname.slice(0, idx + 1);
  })();

  const base = `${origin}${directoryPath}`;
  return new URL(relativePath, base).toString();
}
