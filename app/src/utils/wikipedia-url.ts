export function isWikipediaUrl(url: string): boolean {
  try {
    return new URL(url).hostname.endsWith('wikipedia.org');
  } catch {
    return false;
  }
}

export function deriveWikipediaTitle(url: string): string {
  try {
    const path = new URL(url).pathname;
    const last = path.split('/').pop() ?? '';
    return decodeURIComponent(last).replace(/_/g, ' ');
  } catch {
    return url;
  }
}
